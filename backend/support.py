"""Help chatbot (knowledge base + live booking lookups), contact form, team page."""
import base64
import re

from flask import Blueprint, send_from_directory

from . import catalog, config
from .db import get_db, iso
from .utils import admin_required, body, client_ip, current_user, fail, new_id, ok, rate_limit, text, valid_email

bp = Blueprint("support", __name__, url_prefix="/api")

# Each entry: keywords, answer, link keys (the browser maps keys to page URLs)
KB = [
    (["book", "booking", "ticket", "reserve", "buy ticket"],
     "To book a ticket:\n1. Enter **From** and **To** on the home page and press Search.\n2. Pick a bus and choose your seats.\n3. Pay with UPI, card or net banking. You get instant confirmation.", ["book", "search", "seats"]),
    (["seat", "seats", "window", "aisle", "sleeper", "berth"],
     "You can pick your own seats on the live seat map. Booked seats are greyed out. You can select exactly as many seats as passengers.", ["seats", "book"]),
    (["cancel", "cancellation", "cancelled"],
     "Open **My Trips**, tap an upcoming trip, then choose **Cancel**. The refund depends on how close to departure you cancel:\n- 24 hours or more: **100%**\n- 6 to 24 hours: **75%**\n- 2 to 6 hours: **50%**\n- Under 2 hours: no refund", ["cancel", "trips"]),
    (["refund", "money back", "refunded"],
     "Refunds go back to the original payment method in 5 to 7 working days. Cancelling earlier gets you a bigger refund (100% if 24 hours or more before departure).", ["trips", "terms"]),
    (["track", "tracking", "live", "where is my bus", "location", "eta", "map", "gps"],
     "Open **Track Bus** to see your bus moving on the map with live position and estimated arrival. You can also open the route in Google Maps from there.", ["track"]),
    (["pay", "payment", "upi", "card", "visa", "mastercard", "rupay", "wallet", "netbanking", "failed payment", "payment failed"],
     "We accept UPI, debit and credit cards (Visa, Mastercard, RuPay) and net banking. Saved cards live in **Payment Methods**. If money was deducted but you got no ticket, it is reversed automatically within 5 to 7 working days. Contact us if it is not.", ["pay", "cards", "contact"]),
    (["coupon", "code", "offer", "offers", "discount", "promo", "cashback", "deal"],
     "Current codes:\n- **TRACKB20**: 20% off your first booking (up to ₹200)\n- **UPI10**: 10% off when you pay by UPI (up to ₹150)\n- **WEEKEND30**: 30% off Friday to Sunday trips (up to ₹400)\n- **STUDENT15**: 15% off with a valid student ID (up to ₹150)\n- **FRIEND100**: ₹100 off bookings of ₹500+\nUse one code per booking, at the payment step.", ["offers", "book"]),
    (["student", "id card"], "Use **STUDENT15** for 15% off. Carry a valid student ID while travelling, as the conductor may check it.", ["offers"]),
    (["login", "log in", "sign in", "signin", "password", "forgot", "otp"],
     "Use **Log in** at the top of the page. If you forgot your password, choose **Forgot password?** on the login page and follow the link we send.", ["login", "signup"]),
    (["signup", "sign up", "register", "create account", "account", "new user"],
     "Creating an account is free and takes under a minute. New users get 20% off the first trip with **TRACKB20**.", ["signup"]),
    (["profile", "edit profile", "name", "phone number", "email change", "avatar", "photo"],
     "You can update your name, email, phone and address in **My Profile**.", ["profile"]),
    (["saved route", "favourite", "favorite", "save route"],
     "Save the routes you travel often in **Saved Routes** to book them faster next time.", ["saved"]),
    (["notification", "alert", "reminder", "sms", "whatsapp"],
     "Choose which alerts you get (booking updates, trip reminders, service alerts, offers) in **Notifications**.", ["notif", "settings"]),
    (["dark", "theme", "light mode", "dark mode"], "Change Light, Dark or System theme in **Settings → Theme**. Every page follows it.", ["settings"]),
    (["parcel", "courier", "deliver", "delivery", "send luggage", "send parcel", "send material", "material", "cargo", "shipment", "consignment", "send documents", "send bag"],
     "You can send **luggage, documents, parcels and material** on a bus with TrackB Parcel Delivery. Choose the item, pick a bus, add sender and receiver details and pay. Hand it over at the bus stand (or choose pickup) and the receiver collects it with an OTP, or gets it at the door. Track it with your consignment ID (it starts with **TB**).", ["parcel", "track"]),
    (["luggage", "baggage", "bag", "pet", "child", "infant", "age", "id proof", "document"],
     "Each passenger can usually carry one cabin bag and one larger bag. Carry a government photo ID. Children above 5 need their own seat. Rules vary by operator.", ["terms", "contact"]),
    (["delay", "late", "missed", "miss bus", "no show", "breakdown"],
     "Delays are shown live on **Track Bus**, and you get an alert if your bus runs late. If you miss a bus, contact support right away and we will tell you what the operator allows.", ["track", "contact"]),
    (["safe", "safety", "secure", "security", "privacy", "data"],
     "Payments are processed through secure gateways and we never store full card numbers or CVV. See how we handle data in the Privacy Policy.", ["privacy"]),
    (["contact", "support", "agent", "human", "call", "phone", "email", "helpline", "complaint", "talk"],
     "You can reach a person any time:\n- Phone: **+91 98765 43210** (24/7)\n- Email: **support@smartbus.in**\n- Office: Sector 62, Noida, Uttar Pradesh 201309", ["contact", "help"]),
    (["career", "job", "hiring", "work with", "vacancy"], "We are hiring across engineering, operations and support. See open roles on the Careers page.", ["careers"]),
    (["about", "company", "who are you", "founder", "team", "trackb", "smartbus"], "TrackB (SmartBus) is an intercity bus platform for booking and live tracking, built in India.", ["about"]),
    (["terms", "conditions", "policy", "policies"], "Our rules for bookings, cancellations and refunds are in the Terms & Conditions.", ["terms", "privacy"]),
    (["trip", "trips", "history", "booking history", "my booking", "upcoming", "past"],
     "All your bookings, upcoming, completed and cancelled, are in **My Trips**. You can download a receipt, rate a trip or book it again from there.", ["trips"]),
    (["receipt", "invoice", "gst", "bill"], "Open the trip in **My Trips** and choose **Receipt** to download it.", ["trips"]),
    (["hello", "hi", "hey", "hii", "namaste", "good morning", "good evening"],
     "Hi! I can help with booking, tracking, cancellations, payments and offers. What do you need?", []),
    (["thanks", "thank you", "thx", "ok thanks", "great"], "Happy to help. Safe travels!", []),
]


def norm(s):
    return " " + re.sub(r"\s+", " ", re.sub(r"[^a-z0-9₹ ]+", " ", s.lower())).strip() + " "


def lookup_ids(message):
    """If the message holds a booking (SB…) or parcel (TB…) ID, answer from the live database."""
    m = re.search(r"\b(SB\d{8})\b", message, re.I)
    con, u = get_db(), current_user()
    if m:
        if not u:
            return {"reply": "Please log in first, then ask me about your booking and I will check its status.", "actions": [{"key": "login"}]}
        from .bookings import booking_json
        r = con.execute("SELECT * FROM bookings WHERE id=? AND user_id=?", (m.group(1).upper(), u["id"])).fetchone()
        if not r:
            return {"reply": f"I could not find booking **{m.group(1).upper()}** on your account. Check the ID in **My Trips**.", "actions": [{"key": "trips"}]}
        j = booking_json(r)
        extra = f" You would get **₹{j['refundAmount']}** back if you cancelled now." if j["canCancel"] else ""
        return {"reply": f"Booking **{j['id']}**: {j['from']} to {j['to']} on {j['date']}, {j['bus']}, departs {j['dep']}. Seat {j['seat']}. Status: **{j['status'].title()}**.{extra}",
                "actions": [{"key": "trips"}] + ([{"key": "track"}] if j["status"] == "upcoming" else [])}
    m = re.search(r"\b(TB\d{8})\b", message, re.I)
    if m:
        from .parcels import parcel_json, stage_name
        p = con.execute("SELECT * FROM parcels WHERE id=?", (m.group(1).upper(),)).fetchone()
        if not p:
            return {"reply": f"I could not find a parcel with ID **{m.group(1).upper()}**.", "actions": [{"key": "parcel"}]}
        j = parcel_json(p, False)
        status = "Cancelled" if j["stage"] < 0 else stage_name(p, j["stage"])
        return {"reply": f"Parcel **{j['id']}** ({j['from']} to {j['to']}): **{status}**.", "actions": [{"key": "parcel"}]}
    return None


def answer(message):
    found = lookup_ids(message)
    if found:
        return found
    n = norm(message)
    m = re.search(r"(?:from\s+)?([a-z() ]{3,})\s+(?:to|→|->)\s+([a-z() ]{3,})", message, re.I)
    if m:
        a, b = m.group(1).strip().lower(), m.group(2).strip().lower()
        frm = next((c for c in catalog.CITIES if c.lower() in a), None)
        to = next((c for c in catalog.CITIES if c.lower() in b), None)
        if frm and to and frm != to:
            return {"reply": f"Looking for buses from **{frm}** to **{to}**? Open the search with the cities already filled in.",
                    "actions": [{"search": {"from": frm, "to": to}}]}
        if any(c.lower() in n for c in catalog.CITIES):
            return {"reply": 'Tell me both cities, for example "Delhi to Manali", and I will open the search for you.', "actions": []}
    best, score = None, 0
    for kws, ans, links in KB:
        s = 0
        for w in kws:
            if f" {w} " in n or (len(w) > 4 and w in n):
                s += 3 if " " in w else 2
        if s > score:
            best, score = (ans, links), s
    if best and score >= 2:
        return {"reply": best[0], "actions": [{"key": k} for k in best[1]]}
    return {"reply": "I am not sure about that one. You could try the Help Center, or reach our support team directly. They are available 24/7.",
            "actions": [{"key": "help"}, {"key": "contact"}]}


@bp.post("/chat")
def chat():
    rate_limit("chat:" + client_ip(), 60, 600)
    msg = text(body().get("message"), 300)
    if not msg:
        fail("Type a question first.", 422)
    return ok(**answer(msg))


# ---------------------------------------------------------------------------- contact form
TOPICS = ("booking", "refund", "payment", "advertise", "careers", "other")


@bp.post("/contact")
def contact():
    d = body()
    rate_limit("contact:" + client_ip(), 8, 3600)
    name, email, msg = text(d.get("name"), 80), text(d.get("email"), 120), text(d.get("message"), 2000)
    if not name or not valid_email(email) or len(msg) < 5:
        fail("Add your name, a valid email and a message of at least a few words.", 422)
    topic = d.get("topic") if d.get("topic") in TOPICS else "other"
    u = current_user()
    con = get_db()
    ref = new_id("MSG", 6)
    con.execute("INSERT INTO contact_messages(id,user_id,topic,name,email,booking,message,created_at) VALUES(?,?,?,?,?,?,?,?)",
                (ref, u["id"] if u else None, topic, name, email, text(d.get("booking"), 20), msg, iso(config.now())))
    con.commit()
    return ok(reference=ref, message=f"Thanks {name}. Your message is saved with reference {ref}. We will reply to {email}."), 201


# ---------------------------------------------------------------------------- team (Developers page)
TEAM = [{"id": "gaurav", "name": "Gaurav Kenwat", "role": "CEO & Founder", "initials": "GK", "color": "#e5560c"},
        {"id": "devesh", "name": "Devesh Kaushik", "role": "Co-Founder & CTO", "initials": "DK", "color": "#2f6fed"},
        {"id": "nishant", "name": "Nishant Paul", "role": "Co-Founder & CFO", "initials": "NP", "color": "#1f9d55"}]
TEAM_DIR = config.UPLOAD_DIR / "team"


@bp.get("/team")
def team():
    rows = {r["member"]: r for r in get_db().execute("SELECT * FROM team_photos")}
    return ok(team=[dict(m, photo=(f"/media/team/{rows[m['id']]['filename']}?v={rows[m['id']]['updated_at'][-8:].replace(':', '')}"
                                   if m["id"] in rows else None)) for m in TEAM])


@bp.post("/team/<mid>/photo")
@admin_required
def team_photo(u, mid):
    if mid not in {m["id"] for m in TEAM}:
        fail("Unknown team member.", 404)
    data = body().get("image") or ""
    m = re.match(r"^data:image/(jpeg|png|webp);base64,(.+)$", data, re.S)
    if not m:
        fail("Please choose a JPEG, PNG or WebP image.", 422)
    raw = base64.b64decode(m.group(2), validate=False)
    if len(raw) > config.MAX_UPLOAD:
        fail("Photo is too large (2 MB max).", 413)
    sig = {"jpeg": raw[:3] == b"\xff\xd8\xff", "png": raw[:8] == b"\x89PNG\r\n\x1a\n", "webp": raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"}
    if not sig[m.group(1)]:
        fail("That file is not a valid image.", 422)
    TEAM_DIR.mkdir(parents=True, exist_ok=True)
    for old in TEAM_DIR.glob(mid + ".*"):
        old.unlink()
    ext = "jpg" if m.group(1) == "jpeg" else m.group(1)
    (TEAM_DIR / f"{mid}.{ext}").write_bytes(raw)
    con = get_db()
    con.execute("INSERT INTO team_photos(member,filename,updated_at) VALUES(?,?,?) ON CONFLICT(member) DO UPDATE SET "
                "filename=excluded.filename, updated_at=excluded.updated_at", (mid, f"{mid}.{ext}", iso(config.now())))
    con.commit()
    return team()


@bp.get("/media/<path:name>")        # not used by the site; kept so /media/... works behind the /api prefix too
def media_alias(name):
    return send_from_directory(TEAM_DIR, name.split("/")[-1])
