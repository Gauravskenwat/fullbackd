"""SQLite database: schema, connection helper and demo data."""
import json
import sqlite3
from datetime import timedelta

from flask import g
from werkzeug.security import generate_password_hash

from . import config

SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL, dob TEXT DEFAULT '', gender TEXT DEFAULT 'Prefer not to say',
  address TEXT DEFAULT '', is_admin INTEGER DEFAULT 0, verified INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_settings(
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lang TEXT DEFAULT 'English', units TEXT DEFAULT 'Metric (km, °C)', theme TEXT DEFAULT 'system',
  newsletter INTEGER DEFAULT 1, priv_usage INTEGER DEFAULT 1, priv_offers INTEGER DEFAULT 0,
  priv_profile INTEGER DEFAULT 1, location INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS notif_prefs(
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  booking INTEGER DEFAULT 1, reminder INTEGER DEFAULT 1, service INTEGER DEFAULT 1,
  promo INTEGER DEFAULT 0, system INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS notifications(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL, is_read INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_notif_user ON notifications(user_id, created_at);
CREATE TABLE IF NOT EXISTS cards(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL, last4 TEXT NOT NULL, exp TEXT NOT NULL, holder TEXT DEFAULT '',
  is_default INTEGER DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS saved_routes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, icon TEXT DEFAULT 'pin', line TEXT DEFAULT '', from_city TEXT NOT NULL,
  to_city TEXT NOT NULL, freq TEXT DEFAULT 'Daily', time TEXT DEFAULT '09:00', alerts INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS blocked_users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bookings(
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_city TEXT NOT NULL, to_city TEXT NOT NULL, travel_date TEXT NOT NULL,
  dep_at TEXT NOT NULL, arr_at TEXT NOT NULL, dep TEXT NOT NULL, arr TEXT NOT NULL,
  bus_code TEXT NOT NULL, operator TEXT NOT NULL, bus_type TEXT DEFAULT '',
  seats TEXT NOT NULL, pax INTEGER NOT NULL, fare INTEGER NOT NULL,
  discount INTEGER DEFAULT 0, amount INTEGER NOT NULL, coupon TEXT DEFAULT '',
  km INTEGER DEFAULT 0, pay_label TEXT DEFAULT '', txn_ref TEXT DEFAULT '',
  board TEXT DEFAULT '', drop_pt TEXT DEFAULT '', passenger_name TEXT DEFAULT '', phone TEXT DEFAULT '',
  cancelled INTEGER DEFAULT 0, refund INTEGER DEFAULT 0, cancelled_at TEXT,
  rating INTEGER DEFAULT 0, hidden INTEGER DEFAULT 0, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_book_user ON bookings(user_id, dep_at);
CREATE TABLE IF NOT EXISTS booking_seats(
  trip_key TEXT NOT NULL, seat INTEGER NOT NULL, booking_id TEXT NOT NULL
      REFERENCES bookings(id) ON DELETE CASCADE,
  PRIMARY KEY(trip_key, seat)
);
CREATE TABLE IF NOT EXISTS payments(
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, kind TEXT, ref_id TEXT, amount INTEGER,
  method TEXT, label TEXT, status TEXT, txn_ref TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS parcels(
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_city TEXT, to_city TEXT, ptype TEXT, kg REAL, qty INTEGER, val REAL, ins INTEGER,
  operator TEXT, dep TEXT, send_date TEXT, door_p INTEGER, door_d INTEGER,
  s_name TEXT, s_phone TEXT, s_addr TEXT, r_name TEXT, r_phone TEXT, r_addr TEXT,
  fare INTEGER, pay_label TEXT, otp TEXT, created_ts REAL, cancelled INTEGER DEFAULT 0,
  stage_override INTEGER
);
CREATE TABLE IF NOT EXISTS reviews(
  id INTEGER PRIMARY KEY AUTOINCREMENT, bus_key TEXT NOT NULL,
  user_id INTEGER, name TEXT NOT NULL, rating INTEGER NOT NULL, body TEXT NOT NULL,
  aspect TEXT DEFAULT '', day TEXT NOT NULL, verified INTEGER DEFAULT 0, helpful INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS review_votes(
  review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE, user_id INTEGER NOT NULL,
  PRIMARY KEY(review_id, user_id)
);
CREATE TABLE IF NOT EXISTS bus_positions(
  bus_code TEXT PRIMARY KEY, lat REAL, lng REAL, speed REAL, ts REAL
);
CREATE TABLE IF NOT EXISTS tickets(
  id TEXT PRIMARY KEY, user_id INTEGER, kind TEXT, booking_id TEXT, bus TEXT, message TEXT,
  status TEXT DEFAULT 'open', created_at TEXT
);
CREATE TABLE IF NOT EXISTS driver_messages(
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, bus_code TEXT, sender TEXT, body TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS contact_messages(
  id TEXT PRIMARY KEY, user_id INTEGER, topic TEXT, name TEXT, email TEXT, booking TEXT,
  message TEXT, status TEXT DEFAULT 'new', created_at TEXT
);
CREATE TABLE IF NOT EXISTS newsletter(
  email TEXT PRIMARY KEY, user_id INTEGER, created_at TEXT
);
CREATE TABLE IF NOT EXISTS team_photos(member TEXT PRIMARY KEY, filename TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS password_resets(
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL, used INTEGER DEFAULT 0
);
"""


def get_db():
    if "db" not in g:
        con = sqlite3.connect(config.DB_PATH, timeout=15)
        con.row_factory = sqlite3.Row
        con.execute("PRAGMA foreign_keys=ON")
        g.db = con
    return g.db


def close_db(_exc=None):
    con = g.pop("db", None)
    if con is not None:
        con.close()


def connect_standalone():
    con = sqlite3.connect(config.DB_PATH, timeout=15)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    return con


def iso(dt):
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def create_user(con, name, email, phone, password, **extra):
    """Insert a user with its settings and notification preference rows."""
    cur = con.execute(
        "INSERT INTO users(name,email,phone,password_hash,dob,gender,address,is_admin,created_at) "
        "VALUES(?,?,?,?,?,?,?,?,?)",
        (name, email.lower(), phone, generate_password_hash(password), extra.get("dob", ""),
         extra.get("gender", "Prefer not to say"), extra.get("address", ""),
         1 if extra.get("is_admin") else 0, iso(config.now())))
    uid = cur.lastrowid
    con.execute("INSERT INTO user_settings(user_id) VALUES(?)", (uid,))
    con.execute("INSERT INTO notif_prefs(user_id) VALUES(?)", (uid,))
    return uid


def notify(con, user_id, kind, text, when=None, force=False):
    """Store an in-app notification (respecting the user's preference for that kind)."""
    row = con.execute("SELECT * FROM notif_prefs WHERE user_id=?", (user_id,)).fetchone()
    if not force and row is not None and kind in row.keys() and not row[kind] and kind in ("promo", "system"):
        return
    con.execute("INSERT INTO notifications(user_id,kind,text,created_at) VALUES(?,?,?,?)",
                (user_id, kind, text, iso(when or config.now())))


def init_db():
    config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    con = connect_standalone()
    con.executescript(SCHEMA)
    if not con.execute("SELECT 1 FROM users WHERE email=?", (config.ADMIN_EMAIL,)).fetchone():
        create_user(con, "TrackB Admin", config.ADMIN_EMAIL, "+91 98765 43210", config.ADMIN_PASSWORD, is_admin=1)
    if config.SEED_DEMO and not con.execute("SELECT 1 FROM users WHERE email=?", (config.DEMO_EMAIL,)).fetchone():
        seed_demo(con)
    if not con.execute("SELECT 1 FROM reviews LIMIT 1").fetchone():
        seed_reviews(con)
    con.commit()
    con.close()


# --------------------------------------------------------------------------------------
# Demo data (matches the sample data shown by the original front end)
# --------------------------------------------------------------------------------------
def seed_demo(con):
    from .catalog import distance_km
    uid = create_user(con, "Aarav Mehta", config.DEMO_EMAIL, "+91 98765 43210", config.DEMO_PASSWORD,
                      dob="1990-03-15", gender="Male", address="B-204, Shivaji Nagar, Pune, Maharashtra 411005")
    con.execute("UPDATE user_settings SET newsletter=1 WHERE user_id=?", (uid,))
    for brand, last4, exp, d in (("Visa", "4242", "12/29", 1), ("Mastercard", "8888", "09/28", 0), ("RuPay", "1234", "07/29", 0)):
        con.execute("INSERT INTO cards(user_id,brand,last4,exp,holder,is_default,created_at) VALUES(?,?,?,?,?,?,?)",
                    (uid, brand, last4, exp, "Aarav Mehta", d, iso(config.now())))
    routes = [("Weekend Manali Trip", "pin", "HRTC Volvo", "Delhi", "Manali", "Fri - Sun", "18:30"),
              ("Mumbai - Pune Commute", "work", "MSRTC Shivneri", "Mumbai", "Pune", "Mon - Fri", "07:15"),
              ("Bengaluru to Hyderabad", "pin", "SRS Travels", "Bengaluru", "Hyderabad", "Daily", "21:00")]
    for n, ic, line, a, b, fq, t in routes:
        con.execute("INSERT INTO saved_routes(user_id,name,icon,line,from_city,to_city,freq,time,alerts) VALUES(?,?,?,?,?,?,?,?,1)",
                    (uid, n, ic, line, a, b, fq, t))
    for n in ("Imran Qureshi", "Karthik Subramanian", "Pooja Deshmukh"):
        con.execute("INSERT INTO blocked_users(user_id,name) VALUES(?,?)", (uid, n))

    now = config.now()
    day = lambda n: (now + timedelta(days=n)).strftime("%Y-%m-%d")
    trips = [  # id, from, to, days offset, dep, arr, dur_h, operator, type, seat, pax, fare, pay, status, board, drop
        ("SB12345678", "Delhi", "Manali", 5, "10:30", 19.75, "HRTC Volvo", "Volvo 9400 Multi-Axle", "12A", 1, 1450, "Visa ending 4242", "up",
         "Kashmere Gate ISBT", "Manali Bus Stand"),
        ("SB12345677", "Mumbai", "Pune", -7, "07:15", 3.5, "MSRTC Shivneri", "AC Seater", "4B", 2, 900, "Mastercard ending 8888", "done",
         "Dadar Bus Point", "Swargate Pune"),
        ("SB12345676", "Bengaluru", "Hyderabad", -14, "21:00", 9.5, "SRS Travels", "AC Sleeper", "9C", 1, 1620, "Visa ending 4242", "done",
         "Majestic Bus Stand", "MGBS Hyderabad"),
        ("SB12345675", "Jaipur", "Delhi", -23, "14:00", 5.5, "Raj Travels", "AC Seater", "7A", 1, 700, "Mastercard ending 8888", "cancel",
         "Sindhi Camp", "Anand Vihar ISBT"),
        ("SB12345674", "Delhi", "Jaipur", -43, "06:30", 5.25, "RSRTC Volvo", "Volvo Multi-Axle", "3D", 1, 750, "Visa ending 4242", "done",
         "Kashmere Gate ISBT", "Sindhi Camp"),
        ("SB12345673", "Chandigarh", "Delhi", -65, "17:45", 4.6, "PRTC Volvo", "Volvo Multi-Axle", "11B", 1, 600, "Visa ending 4242", "done",
         "Sector 17 ISBT", "Kashmere Gate ISBT"),
    ]
    from .bookings import seat_number
    for bid, a, b, off, dep, dur, op, btype, seat, pax, fare, pay, st, board, drop in trips:
        d = day(off)
        h, m = map(int, dep.split(":"))
        dep_at = (now + timedelta(days=off)).replace(hour=h, minute=m, second=0)
        arr_at = dep_at + timedelta(hours=dur)
        km = distance_km(a, b)
        seats = [seat] if pax == 1 else [seat, seat[:-1] + "ABCD"[("ABCD".index(seat[-1]) + 1) % 4]]
        con.execute(
            "INSERT INTO bookings(id,user_id,from_city,to_city,travel_date,dep_at,arr_at,dep,arr,bus_code,operator,bus_type,"
            "seats,pax,fare,discount,amount,coupon,km,pay_label,txn_ref,board,drop_pt,passenger_name,phone,cancelled,refund,"
            "cancelled_at,rating,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (bid, uid, a, b, d, iso(dep_at), iso(arr_at), _ampm(dep_at), _ampm(arr_at) + (" (+1)" if arr_at.date() > dep_at.date() else ""),
             "seed-" + bid[-3:], op, btype, json.dumps(seats), pax, fare, fare * pax, "", km, pay, "TXN" + bid[2:],
             board, drop, "Aarav Mehta", "+91 98765 43210", 1 if st == "cancel" else 0,
             fare * pax if st == "cancel" else 0, iso(dep_at - timedelta(days=2)) if st == "cancel" else None,
             {"SB12345677": 5, "SB12345676": 4}.get(bid, 0), iso(dep_at - timedelta(days=9))))
    # notifications (newest first)
    notes = [("booking", "Your booking SB12345678 for Delhi to Manali (HRTC Volvo) is confirmed.", 2, 0),
             ("reminder", "Trip reminder: Your Delhi to Manali bus departs in 5 days. Check-in opens 2 hours before.", 29, 0),
             ("service", "Service alert: Delhi to Chandigarh buses are running 15 minutes late due to traffic.", 60, 0),
             ("promo", "New offer! Get 20% off on your next booking with code TRACKB20.", 180, 1),
             ("system", "New feature: Live tracking is now available on every trip.", 1440, 1),
             ("booking", "Your ticket for SB12345677 (Mumbai to Pune) has been emailed to you.", 2880, 1),
             ("reminder", "Reminder: Carry a valid government photo ID while travelling.", 4320, 1),
             ("service", "Service alert: Shimla route is running 15 minutes late.", 5760, 1),
             ("promo", "Weekend deal: Flat 30% off on Manali trips with WEEKEND30.", 7200, 1),
             ("system", "Your password was updated successfully.", 10080, 1)]
    for kind, text, mins, read in notes:
        con.execute("INSERT INTO notifications(user_id,kind,text,created_at,is_read) VALUES(?,?,?,?,?)",
                    (uid, kind, text, iso(now - timedelta(minutes=mins)), read))
    con.execute("INSERT OR IGNORE INTO newsletter(email,user_id,created_at) VALUES(?,?,?)", (config.DEMO_EMAIL, uid, iso(now)))
    # demo parcels
    import time
    t = time.time()
    con.execute(
        "INSERT INTO parcels(id,user_id,from_city,to_city,ptype,kg,qty,val,ins,operator,dep,send_date,door_p,door_d,s_name,s_phone,s_addr,r_name,r_phone,r_addr,fare,pay_label,otp,created_ts,cancelled,stage_override) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ("TB10000001", uid, "Delhi", "Manali", "parcel", 6, 1, 2000, 0, "Orange Tours", "09:30 AM", day(0), 0, 1,
         "Aarav Mehta", "9876543210", "", "Kavya Thakur", "9812345678", "Old Manali Road, Manali", 540,
         "UPI aarav@okbank", "4821", t - 7 * 60, 0, None))
    con.execute(
        "INSERT INTO parcels(id,user_id,from_city,to_city,ptype,kg,qty,val,ins,operator,dep,send_date,door_p,door_d,s_name,s_phone,s_addr,r_name,r_phone,r_addr,fare,pay_label,otp,created_ts,cancelled,stage_override) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ("TB10000002", uid, "Jaipur", "Delhi", "docs", 1, 1, 500, 0, "VRL Travels", "06:00 AM", day(-3), 0, 0,
         "Aarav Mehta", "9876543210", "", "Rahul Jain", "9899911122", "", 185, "UPI aarav@okbank", "7305",
         t - 3 * 86400, 0, None))


def _ampm(dt):
    return dt.strftime("%I:%M %p")


def seed_reviews(con):
    key = "HRTC Volvo"
    rows = [("Aarav Mehta", 5, "Spotless seats and the AC was perfect on the Manali climb. Driver Rajesh drove very smoothly through the ghats.", "Driver", 17, 18),
            ("Priya Sharma", 5, "Left Delhi right on time and reached Manali 15 minutes early. Live tracking helped my family follow the bus all night.", "Punctuality", 24, 12),
            ("Rohit Verma", 4, "Comfortable semi-sleeper, good legroom. Charging point on my seat did not work, otherwise a great ride.", "Comfort", 31, 5),
            ("Neha Kapoor", 5, "Felt very safe travelling alone at night. Clean washroom stop at Ambala and polite conductor.", "Safety", 43, 9),
            ("Imran Qureshi", 4, "Bus was clean and departure was smooth. Reached Kullu a little late because of road work near Mandi.", "Cleanliness", 52, 3),
            ("Sunita Rao", 3, "Ride was fine but the boarding point was crowded and the blanket was missing at first. Staff fixed it quickly.", "Comfort", 65, 2)]
    for name, r, body, asp, ago, h in rows:
        d = (config.now() - timedelta(days=ago)).strftime("%Y-%m-%d")
        con.execute("INSERT INTO reviews(bus_key,user_id,name,rating,body,aspect,day,verified,helpful) VALUES(?,?,?,?,?,?,?,1,?)",
                    (key, None, name, r, body, asp, d, h))
