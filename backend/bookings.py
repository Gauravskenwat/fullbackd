"""Route search, seat reservation, online payment, trip history and cancellation."""
import json
import sqlite3
from datetime import datetime, timedelta

from flask import Blueprint, Response, request

from . import catalog, config, payments
from .db import get_db, iso, notify
from .utils import body, fail, login_required, new_id, ok, text

bp = Blueprint("bookings", __name__, url_prefix="/api")


def seat_number(label):
    """'12A' -> index 47 (row-major, 4 seats per row)."""
    return (int(label[:-1]) - 1) * 4 + "ABCD".index(label[-1])


def parse_trip_args(src):
    a, b = catalog.norm_city(src.get("from")), catalog.norm_city(src.get("to"))
    if not a or not b:
        fail("Choose a valid departure and destination city.", 422)
    if a == b:
        fail("Choose two different cities.", 422)
    date = text(src.get("date"), 10)
    try:
        d = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        fail("Choose a valid travel date.", 422, "date")
    today = config.now().date()
    if d < today:
        fail("Choose today or a future date.", 422, "date")
    if d > today + timedelta(days=120):
        fail("Bookings open up to 120 days ahead.", 422, "date")
    return a, b, date


def status_of(r):
    if r["cancelled"]:
        return "cancelled"
    return "completed" if r["arr_at"] <= iso(config.now()) else "upcoming"


def booking_json(r):
    st = status_of(r)
    seats = json.loads(r["seats"])
    dep_at = datetime.strptime(r["dep_at"], "%Y-%m-%d %H:%M:%S")
    pct = catalog.refund_percent(dep_at) if st == "upcoming" else None
    return {
        "id": r["id"], "from": r["from_city"], "to": r["to_city"], "date": r["travel_date"], "dep": r["dep"],
        "arr": r["arr"], "bus": r["operator"], "busCode": r["bus_code"], "busType": r["bus_type"],
        "seat": ", ".join(s if isinstance(s, str) else catalog.seat_name(s) for s in seats), "pax": r["pax"],
        "fare": r["fare"], "discount": r["discount"], "coupon": r["coupon"], "total": r["amount"], "km": r["km"],
        "pay": r["pay_label"], "status": st, "board": r["board"], "drop": r["drop_pt"], "rating": r["rating"],
        "refund": r["refund"], "passengerName": r["passenger_name"], "depAt": r["dep_at"],
        "canCancel": st == "upcoming" and pct is not None, "refundPercent": pct,
        "refundAmount": int(r["amount"] * pct / 100) if pct is not None else 0,
    }


# ---------------------------------------------------------------------------- public catalogue
@bp.get("/cities")
def cities():
    return ok(cities=catalog.CITIES)


@bp.get("/offers")
def offers():
    return ok(offers=[{"code": k, "title": v["title"], "note": v["note"]} for k, v in catalog.COUPONS.items()])


@bp.get("/departures")
def departures():
    """Home page 'Live departures': next bus on each headline route with seats left."""
    con, now, out = get_db(), config.now(), []
    for key, rows in catalog.FEATURED.items():
        a, b = key.split("|")
        if key == "Delhi|Jaipur":
            a, b = "Jaipur", "Delhi"
        elif key == "Bengaluru|Chennai":
            a, b = "Chennai", "Bengaluru"
        elif key == "Bengaluru|Hyderabad":
            a, b = "Bengaluru", "Hyderabad"
        for day in (0, 1):
            date = (now + timedelta(days=day)).strftime("%Y-%m-%d")
            bus = next((x for x in catalog.buses_for(a, b, date) if x["featured"] and catalog.bookable(x, now)), None)
            if bus:
                left = 40 - len(catalog.taken_seats(con, a, b, date, bus["code"]))
                out.append({"from": a, "to": b, "operator": bus["operator"], "dep": bus["dep"], "date": date, "seatsLeft": left})
                break
    return ok(departures=out)


@bp.get("/search")
def search():
    a, b, date = parse_trip_args(request.args)
    pax = max(1, min(6, request.args.get("pax", 1, type=int)))
    con, now = get_db(), config.now()
    out = []
    for bus in catalog.buses_for(a, b, date):
        left = 40 - len(catalog.taken_seats(con, a, b, date, bus["code"]))
        out.append({"code": bus["code"], "operator": bus["operator"], "type": bus["type"], "dep": bus["dep"], "arr": bus["arr"],
                    "price": bus["price"], "hours": bus["hours"], "seatsLeft": left, "featured": bus["featured"],
                    "bookable": catalog.bookable(bus, now) and left >= pax})
    return ok(**{"from": a, "to": b, "date": date, "pax": pax, "km": catalog.distance_km(a, b), "buses": out})


@bp.get("/seats")
def seats():
    a, b, date = parse_trip_args(request.args)
    code = text(request.args.get("bus"), 60)
    bus = catalog.find_bus(a, b, date, code)
    if not bus:
        fail("That bus was not found.", 404)
    return ok(taken=catalog.taken_seats(get_db(), a, b, date, code), total=40, bookable=catalog.bookable(bus),
              price=bus["price"], operator=bus["operator"], type=bus["type"], dep=bus["dep"])


# ---------------------------------------------------------------------------- pricing + booking
def price_it(user, a, b, date, code, pax, coupon, method):
    bus = catalog.find_bus(a, b, date, code)
    if not bus:
        fail("That bus was not found.", 404)
    subtotal = bus["price"] * pax
    disc, msg = catalog.evaluate_coupon(get_db(), user["id"], coupon, subtotal, date, method) if coupon else (0, "")
    return bus, subtotal, disc, msg


@bp.post("/bookings/quote")
@login_required
def quote(u):
    d = body()
    a, b, date = parse_trip_args(d)
    pax = max(1, min(6, int(d.get("pax") or 1)))
    bus, subtotal, disc, msg = price_it(u, a, b, date, text(d.get("bus"), 60), pax, d.get("coupon"), d.get("method"))
    return ok(subtotal=subtotal, discount=disc, total=subtotal - disc, message=msg, valid=bool(disc) or not d.get("coupon"))


@bp.post("/bookings")
@login_required
def create_booking(u):
    d = body()
    a, b, date = parse_trip_args(d)
    try:
        pax = int(d.get("pax"))
    except (TypeError, ValueError):
        pax = 0
    if not 1 <= pax <= 6:
        fail("Choose between 1 and 6 passengers.", 422, "pax")
    seat_list = d.get("seats")
    if not isinstance(seat_list, list) or len(set(seat_list)) != pax or not all(isinstance(s, int) and 0 <= s < 40 for s in seat_list):
        fail(f"Select exactly {pax} seat{'s' if pax > 1 else ''}.", 422, "seats")
    name, phone = text(d.get("passengerName"), 80), text(d.get("phone"), 20)
    if len(name) < 2:
        fail("Enter the passenger name.", 422, "passengerName")
    if not __import__("re").match(r"^\+?[\d\s-]{10,}$", phone):
        fail("Enter a valid phone number.", 422, "phone")
    pay = d.get("payment") or {}
    bus, subtotal, disc, msg = price_it(u, a, b, date, text(d.get("bus"), 60), pax, d.get("coupon"), pay.get("method"))
    if d.get("coupon") and not disc:
        fail(msg or "That coupon cannot be applied.", 422, "coupon")
    if not catalog.bookable(bus):
        fail("Booking for this bus has closed (sales stop 15 minutes before departure).", 409)
    con = get_db()
    taken = set(catalog.taken_seats(con, a, b, date, bus["code"]))
    clash = [s for s in seat_list if s in taken]
    if clash:
        fail("Seat " + ", ".join(catalog.seat_name(s) for s in clash) + " was just booked by someone else. Please choose again.", 409, "seats")
    total = subtotal - disc
    method, label, txn = payments.charge(u["id"], "booking", "pending", total, pay)
    bid = new_id("SB")
    while con.execute("SELECT 1 FROM bookings WHERE id=?", (bid,)).fetchone():
        bid = new_id("SB")
    key = catalog.trip_key(a, b, date, bus["code"])
    try:
        con.execute(
            "INSERT INTO bookings(id,user_id,from_city,to_city,travel_date,dep_at,arr_at,dep,arr,bus_code,operator,bus_type,seats,pax,"
            "fare,discount,amount,coupon,km,pay_label,txn_ref,board,drop_pt,passenger_name,phone,created_at) "
            "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (bid, u["id"], a, b, date, iso(bus["dep_at"]), iso(bus["arr_at"]), bus["dep"], bus["arr"], bus["code"], bus["operator"],
             bus["type"], json.dumps(sorted(seat_list)), pax, bus["price"], disc, total, (d.get("coupon") or "").upper() if disc else "",
             bus["km"], label, txn, catalog.stand(a), catalog.stand(b), name, phone, iso(config.now())))
        for s in seat_list:
            con.execute("INSERT INTO booking_seats(trip_key,seat,booking_id) VALUES(?,?,?)", (key, s, bid))
    except sqlite3.IntegrityError:
        con.rollback()
        fail("Those seats were just taken. Please choose again.", 409, "seats")
    payments.record(con, u["id"], "booking", bid, total, method, label, txn)
    notify(con, u["id"], "booking", f"Your booking {bid} for {a} to {b} ({bus['operator']}) is confirmed.")
    notify(con, u["id"], "reminder", f"Trip reminder: {a} to {b} departs on {date} at {bus['dep']}. Check-in opens 2 hours before.",
           config.now() + timedelta(seconds=1))
    con.commit()
    return ok(booking=booking_json(con.execute("SELECT * FROM bookings WHERE id=?", (bid,)).fetchone())), 201


# ---------------------------------------------------------------------------- history
def own_booking(u, bid):
    r = get_db().execute("SELECT * FROM bookings WHERE id=? AND user_id=?", (bid, u["id"])).fetchone()
    if not r:
        fail("Booking not found.", 404)
    return r


@bp.get("/bookings")
@login_required
def list_bookings(u):
    rows = get_db().execute("SELECT * FROM bookings WHERE user_id=? ORDER BY dep_at DESC", (u["id"],)).fetchall()
    vis = [booking_json(r) for r in rows if not r["hidden"]]
    return ok(trips=vis, removed=sum(1 for r in rows if r["hidden"]))


@bp.get("/bookings/<bid>")
@login_required
def get_booking(u, bid):
    return ok(booking=booking_json(own_booking(u, bid)))


@bp.post("/bookings/<bid>/cancel")
@login_required
def cancel(u, bid):
    r = own_booking(u, bid)
    j = booking_json(r)
    if j["status"] == "cancelled":
        fail("This booking is already cancelled.", 409)
    if not j["canCancel"]:
        fail("This trip has already departed or completed and cannot be cancelled.", 409)
    con = get_db()
    refund = j["refundAmount"]
    con.execute("UPDATE bookings SET cancelled=1, refund=?, cancelled_at=? WHERE id=?", (refund, iso(config.now()), bid))
    con.execute("DELETE FROM booking_seats WHERE booking_id=?", (bid,))          # frees the seats
    con.execute("INSERT INTO payments(user_id,kind,ref_id,amount,method,label,status,txn_ref,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (u["id"], "refund", bid, refund, "refund", r["pay_label"], "initiated", r["txn_ref"], iso(config.now())))
    notify(con, u["id"], "booking", f"Booking {bid} ({r['from_city']} to {r['to_city']}) was cancelled. "
           f"Refund of ₹{refund} will reach {r['pay_label']} in 5 to 7 working days.")
    con.commit()
    return ok(booking=booking_json(con.execute("SELECT * FROM bookings WHERE id=?", (bid,)).fetchone()))


@bp.post("/bookings/<bid>/rating")
@login_required
def rate(u, bid):
    r = own_booking(u, bid)
    if status_of(r) != "completed":
        fail("You can rate a trip after it is completed.", 409)
    n = body().get("rating")
    if not isinstance(n, int) or not 1 <= n <= 5:
        fail("Choose a rating from 1 to 5.", 422)
    get_db().execute("UPDATE bookings SET rating=? WHERE id=?", (n, bid))
    get_db().commit()
    return ok(rating=n)


@bp.post("/bookings/<bid>/hide")
@login_required
def hide(u, bid):
    r = own_booking(u, bid)
    if status_of(r) == "upcoming":
        fail("Cancel an upcoming booking instead of removing it.", 409)
    get_db().execute("UPDATE bookings SET hidden=1 WHERE id=?", (bid,))
    get_db().commit()
    return ok()


@bp.post("/bookings/restore")
@login_required
def restore(u):
    get_db().execute("UPDATE bookings SET hidden=0 WHERE user_id=?", (u["id"],))
    get_db().commit()
    return ok()


@bp.get("/bookings/<bid>/receipt")
@login_required
def receipt(u, bid):
    j = booking_json(own_booking(u, bid))
    lines = ["TRACKB TRIP RECEIPT", "===================", f"Booking ID : {j['id']}", f"Status     : {j['status'].title()}",
             f"Route      : {j['from']} -> {j['to']}", f"Date       : {j['date']}", f"Bus        : {j['bus']} ({j['busType']})",
             f"Boarding   : {j['board']} ({j['dep']})", f"Drop-off   : {j['drop']} ({j['arr']})", f"Seat(s)    : {j['seat']}",
             f"Passengers : {j['pax']}", f"Fare       : Rs {j['fare']} x {j['pax']}"]
    if j["discount"]:
        lines.append(f"Coupon     : {j['coupon']} (-Rs {j['discount']})")
    lines += [f"Paid       : Rs {j['total']} via {j['pay']}"]
    if j["status"] == "cancelled":
        lines.append(f"Refunded   : Rs {j['refund']}")
    lines += ["", "Thank you for travelling with TrackB."]
    return Response("\r\n".join(lines), mimetype="text/plain",
                    headers={"Content-Disposition": f"attachment; filename=trackb-receipt-{j['id']}.txt"})
