"""Parcel & Luggage Delivery: pricing, booking, tracking by consignment ID, cancellation."""
import re
import secrets
import time
from datetime import datetime, timedelta

from flask import Blueprint, Response, request

from . import catalog, config, payments
from .db import get_db, iso, notify
from .utils import IN_MOBILE_RE, body, current_user, fail, login_required, new_id, ok, text

bp = Blueprint("parcels", __name__, url_prefix="/api/parcels")

TYPES = {
    "luggage": dict(n="Luggage / Bags", d="Suitcases, trolley & travel bags", base=60, rate=4, max=50, min=1),
    "docs": dict(n="Documents", d="Files, books, sealed envelopes", base=70, rate=0, max=3, min=.1),
    "parcel": dict(n="Parcel / Box", d="Gifts, clothes, household goods", base=80, rate=4.5, max=60, min=.5),
    "elec": dict(n="Electronics", d="Fragile, handle with care", base=150, rate=7, max=40, min=.5),
    "mat": dict(n="Material / Goods", d="Tools, spare parts, shop stock", base=120, rate=5.5, max=150, min=5),
    "furn": dict(n="Furniture / Large", d="Chairs, tables, appliances", base=250, rate=6, max=100, min=5),
}
STAGES = ["Booked", "Received at origin bus stand", "Loaded on bus", "In transit", "Reached destination", "Delivered"]
STEP_MIN = [0, 1, 3, 6, 10, 14]          # demo mode: minutes after booking when each stage is reached
PICKUP_FEE = DELIVERY_FEE = 90
GST = .05
MULT = {"VRL Travels": 1.1, "Orange Tours": 1, "State Roadways Express": .85, "Parveen Travels": 1.15}


def quote_for(ptype, kg, qty, val, ins, pickup, delivery, km, mult=1.0):
    t = TYPES[ptype]
    w = kg * qty
    freight = round((t["base"] + t["rate"] * w * (.6 + km / 500)) * mult / 5) * 5
    pu, dl = PICKUP_FEE if pickup else 0, DELIVERY_FEE if delivery else 0
    insurance = max(25, round(val * .015)) if ins else 0
    sub = freight + pu + dl + insurance
    gst = round(sub * GST)
    return {"freight": freight, "pickup": pu, "delivery": dl, "insurance": insurance, "gst": gst, "total": sub + gst}


def stage_of(p):
    if p["cancelled"]:
        return -1
    if p["stage_override"] is not None:
        return p["stage_override"]
    if config.PARCEL_DEMO:
        m = (time.time() - p["created_ts"]) / 60
        return max(i for i, t in enumerate(STEP_MIN) if m >= t)
    now = config.now()
    return max(i for i, at in enumerate(stage_times(p)) if at <= now)


def stage_times(p):
    created = datetime.fromtimestamp(p["created_ts"], config.IST).replace(tzinfo=None)
    if config.PARCEL_DEMO:
        return [created + timedelta(minutes=m) for m in STEP_MIN]
    bus = next((x for x in catalog.buses_for(p["from_city"], p["to_city"], p["send_date"]) if x["operator"] == p["operator"]), None)
    if not bus:
        return [created + timedelta(minutes=m) for m in STEP_MIN]
    d = bus["dep_at"]
    return [created, max(created, d - timedelta(minutes=60)), max(created, d - timedelta(minutes=20)), d, bus["arr_at"],
            bus["arr_at"] + timedelta(minutes=120 if p["door_d"] else 45)]


def stage_name(p, i):
    if i == 4:
        return f"Out for delivery in {p['to_city']}" if p["door_d"] else f"Reached {p['to_city']} bus stand"
    if i == 5:
        return "Delivered to receiver" if p["door_d"] else "Collected by receiver"
    return STAGES[i]


def mask_phone(v):
    return re.sub(r"\d(?=\d{3})", "•", v or "")


def parcel_json(p, owner):
    s = stage_of(p)
    times = stage_times(p)
    now = config.now()
    return {
        "id": p["id"], "from": p["from_city"], "to": p["to_city"], "type": p["ptype"], "typeName": TYPES[p["ptype"]]["n"],
        "kg": p["kg"], "qty": p["qty"], "val": p["val"], "ins": bool(p["ins"]), "bus": p["operator"], "dep": p["dep"], "date": p["send_date"],
        "door": {"p": p["door_p"], "d": p["door_d"]}, "fare": p["fare"], "pay": p["pay_label"] if owner else "",
        "sender": {"n": p["s_name"], "p": p["s_phone"] if owner else mask_phone(p["s_phone"]), "a": p["s_addr"] if owner else ""},
        "recv": {"n": p["r_name"], "p": p["r_phone"] if owner else mask_phone(p["r_phone"]), "a": p["r_addr"] if owner else ""},
        "otp": p["otp"] if owner else "", "stage": s, "cancelled": bool(p["cancelled"]), "owner": owner,
        "timeline": [{"name": stage_name(p, i), "at": iso(times[i]) if i <= s else None} for i in range(6)],
        "canCancel": owner and 0 <= s <= 1, "createdAt": iso(datetime.fromtimestamp(p["created_ts"], config.IST).replace(tzinfo=None)),
    }


@bp.get("/config")
def get_config():
    return ok(types=TYPES, stages=STAGES, fees={"pickup": PICKUP_FEE, "delivery": DELIVERY_FEE, "gst": GST, "insuranceRate": .015, "insuranceMin": 25},
              cities=catalog.CITIES, maxWeight=150, maxValue=200000)


def parcel_args(src):
    a, b = catalog.norm_city(src.get("from")), catalog.norm_city(src.get("to"))
    if not a or not b:
        fail("Choose valid cities.", 422)
    if a == b:
        fail("Choose two different cities.", 422)
    date = text(src.get("date"), 10)
    try:
        d = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        fail("Choose today or a future date.", 422, "date")
    if d < config.now().date() or d > config.now().date() + timedelta(days=60):
        fail("Choose a date within the next 60 days.", 422, "date")
    return a, b, date


@bp.get("/buses")
def buses():
    a, b, date = parcel_args(request.args)
    now = config.now()
    out = []
    for x in catalog.buses_for(a, b, date):
        out.append({"code": x["code"], "operator": x["operator"], "type": x["type"], "dep": x["dep"], "arr": x["arr"], "hours": x["hours"],
                    "mult": MULT.get(x["operator"], 1), "km": x["km"], "closed": now > x["dep_at"] - timedelta(minutes=60)})
    return ok(buses=out)


def validated(d):
    ptype = d.get("type")
    if ptype not in TYPES:
        fail("Choose what you are sending.", 422, "type")
    t = TYPES[ptype]
    try:
        kg, qty, val = float(d.get("kg")), int(d.get("qty")), float(d.get("val") or 0)
    except (TypeError, ValueError):
        fail("Enter valid weight, items and value.", 422)
    if not t["min"] <= kg <= t["max"]:
        fail(f"{t['n']} must weigh {t['min']}–{t['max']} kg per item.", 422, "kg")
    if not 1 <= qty <= 10:
        fail("Items must be between 1 and 10.", 422, "qty")
    if kg * qty > 150:
        fail("A consignment can weigh 150 kg at most.", 422, "kg")
    if not 0 <= val <= 200000:
        fail("Declared value must be up to ₹2,00,000.", 422, "val")
    if d.get("ins") and val <= 0:
        fail("Enter the declared value to add insurance.", 422, "val")
    return ptype, kg, qty, val


@bp.post("/quote")
def quote():
    d = body()
    a, b, date = parcel_args(d)
    ptype, kg, qty, val = validated(d)
    bus = next((x for x in catalog.buses_for(a, b, date) if x["code"] == d.get("bus")), None)
    km = bus["km"] if bus else catalog.distance_km(a, b)
    return ok(quote=quote_for(ptype, kg, qty, val, bool(d.get("ins")), bool(d.get("pickup")), bool(d.get("delivery")), km,
                              MULT.get(bus["operator"], 1) if bus else 1))


@bp.post("")
@login_required
def create(u):
    d = body()
    a, b, date = parcel_args(d)
    ptype, kg, qty, val = validated(d)
    bus = next((x for x in catalog.buses_for(a, b, date) if x["code"] == d.get("bus")), None)
    if not bus:
        fail("Choose a bus for your parcel.", 422, "bus")
    if config.now() > bus["dep_at"] - timedelta(minutes=60):
        fail("That bus is closed for parcels (hand-over closes 60 minutes before departure). Choose another.", 409)
    pickup, delivery = bool(d.get("pickup")), bool(d.get("delivery"))
    s, r = d.get("sender") or {}, d.get("recv") or {}
    sn, sp, sa = text(s.get("n"), 80), text(s.get("p"), 20), text(s.get("a"), 200)
    rn, rp, ra = text(r.get("n"), 80), text(r.get("p"), 20), text(r.get("a"), 200)
    if len(sn) < 2:
        fail("Enter the sender name.", 422)
    if not IN_MOBILE_RE.match(sp):
        fail("Enter a valid sender mobile number.", 422)
    if pickup and len(sa) < 8:
        fail("Enter the pickup address.", 422)
    if len(rn) < 2:
        fail("Enter the receiver name.", 422)
    if not IN_MOBILE_RE.match(rp):
        fail("Enter a valid receiver mobile number.", 422)
    if delivery and len(ra) < 8:
        fail("Enter the delivery address.", 422)
    if not d.get("agree"):
        fail("Please confirm there are no prohibited items.", 422, "agree")
    q = quote_for(ptype, kg, qty, val, bool(d.get("ins")), pickup, delivery, bus["km"], MULT.get(bus["operator"], 1))
    pid = new_id("TB")
    con = get_db()
    while con.execute("SELECT 1 FROM parcels WHERE id=?", (pid,)).fetchone():
        pid = new_id("TB")
    method, label, txn = payments.charge(u["id"], "parcel", pid, q["total"], d.get("payment"))
    con.execute(
        "INSERT INTO parcels(id,user_id,from_city,to_city,ptype,kg,qty,val,ins,operator,dep,send_date,door_p,door_d,s_name,s_phone,s_addr,"
        "r_name,r_phone,r_addr,fare,pay_label,otp,created_ts,cancelled) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)",
        (pid, u["id"], a, b, ptype, kg, qty, val, 1 if d.get("ins") else 0, bus["operator"], bus["dep"], date, int(pickup), int(delivery),
         sn, sp, sa, rn, rp, ra, q["total"], label, f"{secrets.randbelow(9000) + 1000}", time.time()))
    payments.record(con, u["id"], "parcel", pid, q["total"], method, label, txn)
    notify(con, u["id"], "booking", f"Parcel {pid} ({a} to {b}) is booked. Share the delivery OTP only with the receiver.")
    con.commit()
    return ok(parcel=parcel_json(con.execute("SELECT * FROM parcels WHERE id=?", (pid,)).fetchone(), True), quote=q), 201


@bp.get("")
@login_required
def mine(u):
    rows = get_db().execute("SELECT * FROM parcels WHERE user_id=? ORDER BY created_ts DESC", (u["id"],)).fetchall()
    return ok(parcels=[parcel_json(r, True) for r in rows])


@bp.get("/<pid>")
def track(pid):
    pid = pid.strip().upper()
    p = get_db().execute("SELECT * FROM parcels WHERE id=?", (pid,)).fetchone()
    if not p:
        fail("No parcel found with that ID.", 404)
    u = current_user()
    return ok(parcel=parcel_json(p, bool(u and (u["id"] == p["user_id"] or u["is_admin"]))))


@bp.post("/<pid>/cancel")
@login_required
def cancel(u, pid):
    con = get_db()
    p = con.execute("SELECT * FROM parcels WHERE id=? AND user_id=?", (pid, u["id"])).fetchone()
    if not p:
        fail("Parcel not found.", 404)
    s = stage_of(p)
    if s < 0:
        fail("This shipment is already cancelled.", 409)
    if s > 1:
        fail("This parcel is already on the bus and can no longer be cancelled.", 409)
    con.execute("UPDATE parcels SET cancelled=1 WHERE id=?", (pid,))
    con.execute("INSERT INTO payments(user_id,kind,ref_id,amount,method,label,status,txn_ref,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (u["id"], "refund", pid, p["fare"], "refund", p["pay_label"], "initiated", "", iso(config.now())))
    notify(con, u["id"], "booking", f"Parcel {pid} was cancelled. Refund of ₹{p['fare']} will reach {p['pay_label']} in 5 to 7 working days.")
    con.commit()
    return ok(parcel=parcel_json(con.execute("SELECT * FROM parcels WHERE id=?", (pid,)).fetchone(), True))


@bp.get("/<pid>/receipt")
@login_required
def receipt(u, pid):
    p = get_db().execute("SELECT * FROM parcels WHERE id=? AND user_id=?", (pid, u["id"])).fetchone()
    if not p:
        fail("Parcel not found.", 404)
    j = parcel_json(p, True)
    lines = ["TRACKB PARCEL RECEIPT", "", f"Consignment: {j['id']}", f"Route: {j['from']} -> {j['to']}",
             f"Item: {j['typeName']} ({j['qty']} x {j['kg']} kg)", f"Bus: {j['bus']}, departs {j['dep']} on {j['date']}",
             f"Sender: {j['sender']['n']} ({j['sender']['p']})", f"Receiver: {j['recv']['n']} ({j['recv']['p']})",
             f"Delivery: {'Doorstep' if j['door']['d'] else 'Collect at bus stand'}", f"Delivery OTP: {j['otp']}",
             f"Amount paid: Rs {j['fare']} ({j['pay']})", "", "Thank you for choosing TrackB."]
    return Response("\r\n".join(lines), mimetype="text/plain",
                    headers={"Content-Disposition": f"attachment; filename=trackb-parcel-{j['id']}.txt"})
