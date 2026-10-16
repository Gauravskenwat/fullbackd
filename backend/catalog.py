"""Static business data and rules: cities, routes, bus schedules, seat inventory, coupons."""
import re
from datetime import datetime, timedelta

from . import config

CITIES = ["Delhi", "Manali", "Shimla", "Chandigarh", "Jaipur", "Mumbai", "Pune", "Bengaluru", "Hyderabad",
          "Chennai", "Panaji", "Ahmedabad", "Rajkot", "Kolkata", "Lucknow", "Nagpur", "Indore", "Bhopal",
          "Surat", "Kochi", "Coimbatore", "Amritsar", "Dehradun", "Udaipur"]

CITY_ALIASES = {"goa": "Panaji", "goa (panaji)": "Panaji", "bangalore": "Bengaluru", "bombay": "Mumbai",
                "calcutta": "Kolkata", "madras": "Chennai", "new delhi": "Delhi"}

COORDS = {  # lat, lng of the main bus stand
    "Delhi": (28.6676, 77.2285), "Manali": (32.2396, 77.1887), "Shimla": (31.1048, 77.1734),
    "Chandigarh": (30.7333, 76.7794), "Jaipur": (26.9124, 75.7873), "Mumbai": (19.0176, 72.8562),
    "Pune": (18.5018, 73.8636), "Bengaluru": (12.9767, 77.5713), "Hyderabad": (17.3616, 78.4747),
    "Chennai": (13.0827, 80.2707), "Panaji": (15.4909, 73.8278), "Ahmedabad": (23.0225, 72.5714),
    "Rajkot": (22.3039, 70.8022), "Kolkata": (22.5726, 88.3639), "Lucknow": (26.8467, 80.9462),
    "Nagpur": (21.1458, 79.0882), "Indore": (22.7196, 75.8577), "Bhopal": (23.2599, 77.4126),
    "Surat": (21.1702, 72.8311), "Kochi": (9.9312, 76.2673), "Coimbatore": (11.0168, 76.9558),
    "Amritsar": (31.6340, 74.8723), "Dehradun": (30.3165, 78.0322), "Udaipur": (24.5854, 73.7125),
}

BUS_STANDS = {"Delhi": "Kashmere Gate ISBT", "Manali": "Manali Bus Stand", "Mumbai": "Dadar Bus Point",
              "Pune": "Swargate Pune", "Bengaluru": "Majestic Bus Stand", "Hyderabad": "MGBS Hyderabad",
              "Jaipur": "Sindhi Camp", "Chandigarh": "Sector 17 ISBT"}

DIST = {"Delhi|Manali": 535, "Delhi|Shimla": 345, "Delhi|Jaipur": 280, "Chandigarh|Delhi": 250,
        "Amritsar|Delhi": 450, "Delhi|Dehradun": 250, "Delhi|Lucknow": 555, "Delhi|Mumbai": 1400,
        "Mumbai|Pune": 150, "Bengaluru|Hyderabad": 570, "Bengaluru|Chennai": 350, "Chandigarh|Manali": 310,
        "Chandigarh|Shimla": 115, "Ahmedabad|Mumbai": 530, "Ahmedabad|Surat": 265}

SLOW = {"Delhi|Manali": 13.75, "Chandigarh|Manali": 8.0, "Delhi|Shimla": 8.5, "Chandigarh|Shimla": 3.5}  # hill routes (hours)


def norm_city(name):
    if not name:
        return None
    n = re.sub(r"\s+", " ", str(name)).strip()
    n = CITY_ALIASES.get(n.lower(), n)
    for c in CITIES:
        if c.lower() == n.lower():
            return c
    return None


def pair_key(a, b):
    return "|".join(sorted([a, b]))


def _hash(s):
    h = 7
    for ch in s:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return h


def distance_km(a, b):
    return DIST.get(pair_key(a, b)) or 150 + _hash(",".join(sorted([a, b]))) % 500


def duration_h(a, b):
    k = pair_key(a, b)
    if k in SLOW:
        return SLOW[k]
    return max(1.5, round(distance_km(a, b) / 52 * 4) / 4)


def stand(city):
    return BUS_STANDS.get(city, f"{city} Bus Stand")


# ---------------------------------------------------------------------------- buses
STANDARD = [("06:00", "AC Sleeper", "VRL Travels", 250), ("09:30", "AC Seater", "Orange Tours", 0),
            ("13:15", "Non-AC Seater", "State Roadways Express", None), ("21:00", "Volvo Multi-Axle", "Parveen Travels", 150)]

FEATURED = {  # headline buses shown on the home page (same both directions)
    "Delhi|Manali": [("18:30", "Volvo 9400 Multi-Axle AC Semi-Sleeper", "HRTC Volvo", 150)],
    "Mumbai|Pune": [("11:15", "Shivneri AC Seater", "MSRTC Shivneri", 0)],
    "Bengaluru|Hyderabad": [("21:45", "AC Sleeper", "SRS Travels", 200)],
    "Delhi|Jaipur": [("17:45", "Volvo Multi-Axle", "RSRTC Volvo", 100)],
    "Bengaluru|Chennai": [("14:20", "Airavat AC Seater", "KSRTC Airavat", 50)],
}


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def _ampm(hhmm):
    h, m = map(int, hhmm.split(":"))
    return f"{(h % 12) or 12:02d}:{m:02d} {'AM' if h < 12 else 'PM'}"


def trip_key(a, b, date, bus_code):
    return f"{a}|{b}|{date}|{bus_code}"


def buses_for(a, b, date):
    """All scheduled departures for a city pair on a date (deterministic, no DB)."""
    km = distance_km(a, b)
    base = max(300, round(km * 2.6 / 10) * 10)
    hrs = duration_h(a, b)
    out = []
    rows = list(FEATURED.get(pair_key(a, b), [])) + STANDARD
    for hhmm, btype, op, extra in rows:
        price = round(base * .75 / 10) * 10 if extra is None else base + extra
        h, m = map(int, hhmm.split(":"))
        dep_at = datetime.strptime(date, "%Y-%m-%d").replace(hour=h, minute=m)
        arr_at = dep_at + timedelta(hours=hrs)
        out.append({
            "code": f"{slug(op)}-{hhmm.replace(':', '')}", "operator": op, "type": btype, "price": price,
            "dep": _ampm(hhmm), "dep_at": dep_at, "arr_at": arr_at,
            "arr": _ampm(arr_at.strftime("%H:%M")) + (" (+1)" if arr_at.date() > dep_at.date() else ""),
            "hours": hrs, "km": km, "seats_total": 40,
            "featured": op in [r[2] for r in FEATURED.get(pair_key(a, b), [])],
        })
    out.sort(key=lambda x: x["dep_at"])
    return out


def find_bus(a, b, date, code):
    return next((x for x in buses_for(a, b, date) if x["code"] == code), None)


def bookable(bus, now=None):
    """Sales close 15 minutes before departure."""
    return (now or config.now()) < bus["dep_at"] - timedelta(minutes=15)


def seat_name(i):
    return f"{i // 4 + 1}{'ABCD'[i % 4]}"


def baseline_taken(a, b, bus_code):
    """Seats the operator has already sold elsewhere (stable pseudo-random occupancy)."""
    h = _hash(a + b + bus_code)
    h32 = h - (1 << 32) if h >= (1 << 31) else h          # JS '>>' works on signed 32-bit values
    taken = set()
    for i in range(40):
        if (h32 >> (((i % 20) + i) & 31)) % 3 == 0 and i % 4 != 1:
            taken.add(i)
    return taken


def taken_seats(con, a, b, date, bus_code):
    key = trip_key(a, b, date, bus_code)
    rows = con.execute("SELECT seat FROM booking_seats WHERE trip_key=?", (key,)).fetchall()
    return sorted(baseline_taken(a, b, bus_code) | {r["seat"] for r in rows})


# ---------------------------------------------------------------------------- coupons
COUPONS = {
    "TRACKB20": dict(title="First booking", pct=20, cap=200, note="20% off your first booking, up to ₹200"),
    "UPI10": dict(title="UPI cashback", pct=10, cap=150, note="10% off when you pay by UPI, up to ₹150"),
    "WEEKEND30": dict(title="Weekend trips", pct=30, cap=400, note="30% off on Friday to Sunday travel, up to ₹400"),
    "STUDENT15": dict(title="Student pass", pct=15, cap=150, note="15% off with a valid student ID, up to ₹150"),
    "FRIEND100": dict(title="Refer & earn", flat=100, minimum=500, note="₹100 off bookings of ₹500 or more (once per account)"),
}
PARTNER_CODES = {"STAY40", "CAB50", "SAFE19", "EAT15"}


def evaluate_coupon(con, user_id, code, amount, travel_date, method):
    """Return (discount, message). discount is 0 when the code cannot be used."""
    code = (code or "").strip().upper()
    if not code:
        return 0, ""
    if code in PARTNER_CODES:
        return 0, f"{code} is a partner offer and cannot be used on bus tickets."
    c = COUPONS.get(code)
    if not c:
        return 0, f"{code} is not a valid coupon code."
    used = con.execute("SELECT COUNT(*) n FROM bookings WHERE user_id=? AND cancelled=0", (user_id,)).fetchone()["n"]
    if code == "TRACKB20" and used > 0:
        return 0, "TRACKB20 is only valid on your first booking."
    if code == "UPI10" and method != "upi":
        return 0, "UPI10 is only valid when you pay with UPI."
    if code == "WEEKEND30":
        wd = datetime.strptime(travel_date, "%Y-%m-%d").weekday()   # Mon=0
        if wd not in (4, 5, 6):
            return 0, "WEEKEND30 is only valid for travel from Friday to Sunday."
    if code == "FRIEND100":
        if amount < c["minimum"]:
            return 0, "FRIEND100 needs a booking of at least ₹500."
        if con.execute("SELECT 1 FROM bookings WHERE user_id=? AND coupon='FRIEND100' AND cancelled=0", (user_id,)).fetchone():
            return 0, "FRIEND100 has already been used on this account."
    disc = c.get("flat") or min(c["cap"], int(amount * c["pct"] / 100))
    disc = max(0, min(int(disc), amount))
    return disc, f"{code} applied: you save ₹{disc}."


def refund_percent(dep_at, now=None):
    hrs = (dep_at - (now or config.now())).total_seconds() / 3600
    if hrs <= 0:
        return None            # already departed: cannot cancel
    for min_h, pct in config.REFUND_TIERS:
        if hrs >= min_h:
            return pct
    return 0
