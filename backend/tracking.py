"""Live tracking, bus reviews, driver messages and help tickets."""
import hmac
import math
import time
from datetime import datetime, timedelta

from flask import Blueprint, request

from . import catalog, config
from .db import get_db, iso
from .utils import body, client_ip, current_user, fail, login_required, new_id, ok, rate_limit, text

bp = Blueprint("tracking", __name__, url_prefix="/api")

# Delhi -> Manali with real stop coordinates (minutes after departure, state)
DELHI_MANALI = [("Delhi (Kashmere Gate ISBT)", 0, 28.6676, 77.2285, "Delhi"), ("Murthal", 65, 29.0277, 77.0794, "Haryana"),
                ("Panipat", 110, 29.3909, 76.9635, "Haryana"), ("Karnal", 145, 29.6857, 76.9905, "Haryana"),
                ("Ambala", 225, 30.3782, 76.7767, "Haryana"), ("Chandigarh", 290, 30.7333, 76.7794, "Chandigarh"),
                ("Ropar (Rupnagar)", 340, 30.9669, 76.5331, "Punjab"), ("Bilaspur", 445, 31.3380, 76.7561, "Himachal Pradesh"),
                ("Sundernagar", 510, 31.5332, 76.8886, "Himachal Pradesh"), ("Mandi", 560, 31.7084, 76.9319, "Himachal Pradesh"),
                ("Kullu", 710, 31.9592, 77.1089, "Himachal Pradesh"), ("Manali (Bus Stand)", 825, 32.2396, 77.1887, "Himachal Pradesh")]

DRIVERS = ["Rajesh Kumar", "Sandeep Yadav", "Manoj Patil", "Imtiyaz Khan", "Gurpreet Singh", "Ramesh Naidu"]
STATE_CODE = {"Delhi": "DL", "Manali": "HP", "Shimla": "HP", "Chandigarh": "CH", "Jaipur": "RJ", "Udaipur": "RJ", "Mumbai": "MH",
              "Pune": "MH", "Nagpur": "MH", "Bengaluru": "KA", "Hyderabad": "TS", "Chennai": "TN", "Coimbatore": "TN",
              "Panaji": "GA", "Ahmedabad": "GJ", "Rajkot": "GJ", "Surat": "GJ", "Kolkata": "WB", "Lucknow": "UP",
              "Indore": "MP", "Bhopal": "MP", "Kochi": "KL", "Amritsar": "PB", "Dehradun": "UK"}
DEMO_CODE = "hrtc-volvo-1830"
DEMO_SPEEDUP = 8          # demo bus drives 8x faster than real time so you can see it move


def hav(a, b):
    r = 6371
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = p2 - p1, math.radians(b[1] - a[1])
    x = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(x))


def clock(dt):
    return dt.strftime("%I:%M %p")


def build_trip(a, b, date, bus):
    """Assemble stops with scheduled times for a bus."""
    if (a, b) == ("Delhi", "Manali"):
        raw = DELHI_MANALI
    elif (a, b) == ("Manali", "Delhi"):
        total = DELHI_MANALI[-1][1]
        raw = [(n, total - o, la, lo, s) for n, o, la, lo, s in reversed(DELHI_MANALI)]
    else:
        total = int(bus["hours"] * 60)
        (la1, lo1), (la2, lo2) = catalog.COORDS[a], catalog.COORDS[b]
        raw = [(catalog.stand(a), 0, la1, lo1, a), (catalog.stand(b), total, la2, lo2, b)]
    stops, cum = [], 0.0
    for i, (n, off, la, lo, st) in enumerate(raw):
        if i:
            cum += hav((raw[i - 1][2], raw[i - 1][3]), (la, lo))
        stops.append({"name": n, "off": off, "time": clock(bus["dep_at"] + timedelta(minutes=off)), "lat": la, "lng": lo,
                      "state": st, "km": round(cum, 1)})
    for s in stops:
        s["frac"] = round(s["km"] / cum, 5) if cum else 0
    return stops, cum


def schedule_progress(stops, dep_at, now):
    """Fraction of the route covered at `now` by interpolating between scheduled stop times."""
    mins = (now - dep_at).total_seconds() / 60
    if mins <= 0:
        return 0.0
    if mins >= stops[-1]["off"]:
        return 1.0
    for i in range(1, len(stops)):
        if mins <= stops[i]["off"]:
            a, b = stops[i - 1], stops[i]
            t = (mins - a["off"]) / max(1, b["off"] - a["off"])
            return a["frac"] + (b["frac"] - a["frac"]) * t
    return 1.0


def project(stops, lat, lng):
    """Project a GPS fix onto the straight legs between stops and return the route fraction."""
    best, best_d = 0.0, 1e9
    for i in range(1, len(stops)):
        a, b = stops[i - 1], stops[i]
        ax, ay, bx, by = a["lng"], a["lat"], b["lng"], b["lat"]
        dx, dy = bx - ax, by - ay
        L = dx * dx + dy * dy or 1e-12
        t = max(0, min(1, ((lng - ax) * dx + (lat - ay) * dy) / L))
        px, py = ax + t * dx, ay + t * dy
        d = hav((lat, lng), (py, px))
        if d < best_d:
            best_d, best = d, a["frac"] + (b["frac"] - a["frac"]) * t
    return best


def identity(op, a, b):
    h = sum(ord(c) for c in op + a + b)
    if op == "HRTC Volvo":
        reg, drv = "HP 01 AC 4521", DRIVERS[0]
    else:
        reg = f"{STATE_CODE.get(a, 'IN')} {h % 90 + 10:02d} {chr(65 + h % 26)}{chr(65 + (h // 7) % 26)} {h * 7 % 9000 + 1000}"
        drv = DRIVERS[h % len(DRIVERS)]
    return reg, {"name": drv, "rating": round(4.5 + (h % 5) / 10, 1), "reviews": 80 + h % 220}


def resolve_trip(args):
    """Return (trip dict) from ?booking=… (owner only) or ?bus=&from=&to=&date= or the demo bus."""
    con, now = get_db(), config.now()
    bid = text(args.get("booking"), 20)
    if bid:
        u = current_user()
        if not u:
            fail("Log in to track your booking.", 401)
        r = con.execute("SELECT * FROM bookings WHERE id=? AND user_id=?", (bid, u["id"])).fetchone()
        if not r:
            fail("Booking not found.", 404)
        if r["cancelled"]:
            fail("This booking was cancelled, so there is no bus to track.", 409)
        a, b, date = r["from_city"], r["to_city"], r["travel_date"]
        bus = catalog.find_bus(a, b, date, r["bus_code"]) or {
            "code": r["bus_code"], "operator": r["operator"], "type": r["bus_type"], "dep": r["dep"], "arr": r["arr"],
            "dep_at": datetime.strptime(r["dep_at"], "%Y-%m-%d %H:%M:%S"), "arr_at": datetime.strptime(r["arr_at"], "%Y-%m-%d %H:%M:%S"),
            "hours": (datetime.strptime(r["arr_at"], "%Y-%m-%d %H:%M:%S") - datetime.strptime(r["dep_at"], "%Y-%m-%d %H:%M:%S")).total_seconds() / 3600,
            "km": r["km"]}
        bus = dict(bus, dep_at=datetime.strptime(r["dep_at"], "%Y-%m-%d %H:%M:%S"), arr_at=datetime.strptime(r["arr_at"], "%Y-%m-%d %H:%M:%S"))
        return dict(a=a, b=b, date=date, bus=bus, seat=r["seats"], booking=bid, demo=False)
    code = text(args.get("bus"), 60)
    if not code or code == DEMO_CODE and not args.get("from"):
        a, b, date, code = "Delhi", "Manali", now.strftime("%Y-%m-%d"), DEMO_CODE
    else:
        a, b = catalog.norm_city(args.get("from")), catalog.norm_city(args.get("to"))
        date = text(args.get("date"), 10) or now.strftime("%Y-%m-%d")
        if not a or not b:
            fail("Unknown route.", 404)
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        fail("Invalid date.", 422)
    bus = catalog.find_bus(a, b, date, code)
    if not bus:
        fail("Bus not found.", 404)
    return dict(a=a, b=b, date=date, bus=bus, seat="", booking="", demo=(code == DEMO_CODE and a == "Delhi"))


@bp.get("/tracking")
def tracking():
    trip = resolve_trip(request.args)
    a, b, bus, now, con = trip["a"], trip["b"], trip["bus"], config.now(), get_db()
    stops, total_km = build_trip(a, b, trip["date"], bus)
    reg, driver = identity(bus["operator"], a, b)
    code = bus["code"]
    gps = con.execute("SELECT * FROM bus_positions WHERE bus_code=?", (code,)).fetchone()
    source, speed = "schedule", 0.0
    if gps and time.time() - gps["ts"] < 180:
        source, progress, speed = "gps", project(stops, gps["lat"], gps["lng"]), gps["speed"] or 0
    elif trip["demo"] and config.DEMO_FLEET:
        cycle = stops[-1]["off"] * 60 / DEMO_SPEEDUP
        progress = (time.time() % cycle) / cycle
        source = "demo"
        speed = 63 + 10 * math.sin(time.time() / 37)
    else:
        progress = schedule_progress(stops, bus["dep_at"], now)
        speed = 0 if progress in (0.0, 1.0) else (total_km / max(.1, bus["hours"]))
    state = "arrived" if progress >= .9995 else "scheduled" if (progress <= 0 and source == "schedule") else "running"
    cur = max([i for i, s in enumerate(stops) if s["frac"] <= progress] or [0])
    left = 40 - len(catalog.taken_seats(con, a, b, trip["date"], code))
    mins_to_dep = int((bus["dep_at"] - now).total_seconds() / 60) if state == "scheduled" else 0
    return ok(
        bus={"code": code, "operator": bus["operator"], "type": bus["type"], "reg": reg, "from": a, "to": b, "date": trip["date"],
             "dep": bus["dep"], "arr": bus["arr"], "seatsLeft": left, "seat": trip["seat"], "booking": trip["booking"],
             "demo": trip["demo"]},
        driver=driver, stops=stops, totalKm=round(total_km), durationMin=stops[-1]["off"],
        state=state, source=source, progress=round(progress, 6), speed=round(speed), current=cur,
        minutesToDeparture=mins_to_dep, serverTime=iso(now),
        gps={"lat": gps["lat"], "lng": gps["lng"], "ts": gps["ts"]} if source == "gps" else None)


@bp.post("/tracking/gps")
def gps_ingest():
    """Real GPS feed. Devices/drivers POST {bus, lat, lng, speed} with the X-GPS-Key header."""
    if not hmac.compare_digest(request.headers.get("X-GPS-Key", ""), config.GPS_KEY):
        fail("Invalid GPS key.", 403)
    d = body()
    try:
        lat, lng, spd = float(d["lat"]), float(d["lng"]), float(d.get("speed") or 0)
    except (KeyError, TypeError, ValueError):
        fail("lat and lng are required numbers.", 422)
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        fail("Coordinates out of range.", 422)
    code = text(d.get("bus"), 60)
    if not code:
        fail("bus code is required.", 422)
    con = get_db()
    con.execute("INSERT INTO bus_positions(bus_code,lat,lng,speed,ts) VALUES(?,?,?,?,?) ON CONFLICT(bus_code) DO UPDATE SET "
                "lat=excluded.lat,lng=excluded.lng,speed=excluded.speed,ts=excluded.ts", (code, lat, lng, spd, time.time()))
    con.commit()
    return ok()


# ---------------------------------------------------------------------------- reviews
def review_json(r, liked):
    return {"id": r["id"], "n": r["name"], "r": r["rating"], "t": r["body"], "a": r["aspect"], "d": r["day"],
            "v": r["verified"], "h": r["helpful"], "liked": r["id"] in liked}


@bp.get("/reviews")
def reviews():
    bus = text(request.args.get("bus"), 80)
    if not bus:
        fail("bus is required.", 422)
    u = current_user()
    con = get_db()
    liked = {r["review_id"] for r in con.execute("SELECT review_id FROM review_votes WHERE user_id=?", (u["id"],))} if u else set()
    rows = con.execute("SELECT * FROM reviews WHERE bus_key=? ORDER BY day DESC, id DESC", (bus,)).fetchall()
    return ok(reviews=[review_json(r, liked) for r in rows])


@bp.post("/reviews")
@login_required
def add_review(u):
    d = body()
    bus = text(d.get("bus"), 80)
    rating, txt = d.get("rating"), text(d.get("text"), 400)
    if not bus:
        fail("bus is required.", 422)
    if not isinstance(rating, int) or not 1 <= rating <= 5:
        fail("Please choose a star rating.", 422, "rating")
    if len(txt) < 10:
        fail("Write at least 10 characters about your trip.", 422, "text")
    rate_limit(f"review:{u['id']}", 10, 86400)
    con = get_db()
    verified = 1 if con.execute("SELECT 1 FROM bookings WHERE user_id=? AND operator=? AND cancelled=0", (u["id"], bus)).fetchone() else 0
    name = text(d.get("name"), 40) or u["name"]
    cur = con.execute("INSERT INTO reviews(bus_key,user_id,name,rating,body,aspect,day,verified) VALUES(?,?,?,?,?,?,?,?)",
                      (bus, u["id"], name, rating, txt, text(d.get("aspect"), 20), config.now().strftime("%Y-%m-%d"), verified))
    con.commit()
    return ok(review=review_json(con.execute("SELECT * FROM reviews WHERE id=?", (cur.lastrowid,)).fetchone(), set())), 201


@bp.post("/reviews/<int:rid>/helpful")
@login_required
def helpful(u, rid):
    con = get_db()
    if not con.execute("SELECT 1 FROM reviews WHERE id=?", (rid,)).fetchone():
        fail("Review not found.", 404)
    if con.execute("SELECT 1 FROM review_votes WHERE review_id=? AND user_id=?", (rid, u["id"])).fetchone():
        con.execute("DELETE FROM review_votes WHERE review_id=? AND user_id=?", (rid, u["id"]))
        con.execute("UPDATE reviews SET helpful=MAX(0,helpful-1) WHERE id=?", (rid,))
        liked = False
    else:
        con.execute("INSERT INTO review_votes(review_id,user_id) VALUES(?,?)", (rid, u["id"]))
        con.execute("UPDATE reviews SET helpful=helpful+1 WHERE id=?", (rid,))
        liked = True
    con.commit()
    return ok(liked=liked, helpful=con.execute("SELECT helpful FROM reviews WHERE id=?", (rid,)).fetchone()["helpful"])


# ---------------------------------------------------------------------------- driver chat + help tickets
@bp.get("/tracking/messages")
@login_required
def messages(u):
    rows = get_db().execute("SELECT sender,body FROM driver_messages WHERE user_id=? AND bus_code=? ORDER BY id DESC LIMIT 30",
                            (u["id"], text(request.args.get("bus"), 60))).fetchall()
    return ok(messages=[{"me": r["sender"] == "me", "text": r["body"]} for r in reversed(rows)])


@bp.post("/tracking/messages")
@login_required
def send_message(u):
    d = body()
    code, msg = text(d.get("bus"), 60), text(d.get("text"), 300)
    if not code or not msg:
        fail("Type a message first.", 422)
    rate_limit(f"drvmsg:{u['id']}", 30, 3600)
    con = get_db()
    n = iso(config.now())
    con.execute("INSERT INTO driver_messages(user_id,bus_code,sender,body,created_at) VALUES(?,?,?,?,?)", (u["id"], code, "me", msg, n))
    reply = "Got it. We'll reach the next stop on time."
    con.execute("INSERT INTO driver_messages(user_id,bus_code,sender,body,created_at) VALUES(?,?,?,?,?)", (u["id"], code, "driver", reply, n))
    con.commit()
    return ok(reply=reply)


@bp.post("/tracking/call")
@login_required
def call_driver(u):
    rate_limit(f"drvcall:{u['id']}", 10, 3600)
    d = body()
    con = get_db()
    con.execute("INSERT INTO tickets(id,user_id,kind,bus,message,created_at) VALUES(?,?,?,?,?,?)",
                (new_id("TK", 6), u["id"], "call", text(d.get("bus"), 60), "Call to driver requested", iso(config.now())))
    con.commit()
    return ok(message="Connecting you through the TrackB support line.")


TICKET_KINDS = {"delay": "Delay report sent to support", "lost": "Lost item ticket created",
                "support": "Support will call you in 2 minutes", "emergency": "Emergency alert sent. Help is on the way"}


@bp.post("/tickets")
def create_ticket():
    d = body()
    kind = d.get("kind")
    if kind not in TICKET_KINDS:
        fail("Unknown request type.", 422)
    u = current_user()
    rate_limit("ticket:" + (str(u["id"]) if u else client_ip()), 10 if kind != "emergency" else 30, 3600)
    tid = new_id("TK", 6)
    con = get_db()
    con.execute("INSERT INTO tickets(id,user_id,kind,booking_id,bus,message,created_at) VALUES(?,?,?,?,?,?,?)",
                (tid, u["id"] if u else None, kind, text(d.get("bookingId"), 20), text(d.get("bus"), 60), text(d.get("message"), 400),
                 iso(config.now())))
    con.commit()
    return ok(ticket=tid, message=TICKET_KINDS[kind]), 201
