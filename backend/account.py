"""Everything behind the Profile pages: profile, payment methods, saved routes, notifications, settings."""
import re
from datetime import datetime

from flask import Blueprint

from . import catalog, config
from .db import get_db, iso
from .utils import (PHONE_RE, body, card_brand, card_expired, current_user, fail, luhn, login_required, ok, text, valid_email,
                    rate_limit, client_ip)

bp = Blueprint("account", __name__, url_prefix="/api")

NOTIF_KEYS = ("booking", "reminder", "service", "promo", "system")
LANGS = ("English", "हिन्दी", "ગુજરાતી")
UNITS = ("Metric (km, °C)", "Imperial (mi, °F)")


# ---------------------------------------------------------------------------- serializers
def profile_json(u):
    return {"name": u["name"], "email": u["email"], "phone": u["phone"], "dob": u["dob"] or "", "gender": u["gender"] or "",
            "address": u["address"] or ""}


def settings_json(uid):
    s = get_db().execute("SELECT * FROM user_settings WHERE user_id=?", (uid,)).fetchone()
    return {"lang": s["lang"], "units": s["units"], "theme": s["theme"], "news": s["newsletter"],
            "priv": {"usage": s["priv_usage"], "offers": s["priv_offers"], "profile": s["priv_profile"]}, "loc": s["location"]}


def card_json(c):
    return {"id": c["id"], "b": c["brand"], "l": c["last4"], "e": c["exp"], "d": c["is_default"], "holder": c["holder"]}


def route_json(r):
    return {"id": r["id"], "name": r["name"], "icon": r["icon"], "line": r["line"], "from": r["from_city"], "to": r["to_city"],
            "freq": r["freq"], "time": r["time"], "on": r["alerts"]}


def ago(iso_s):
    secs = max(0, (config.now() - datetime.strptime(iso_s, "%Y-%m-%d %H:%M:%S")).total_seconds())
    m = int(secs // 60)
    if m < 1:
        return "just now"
    if m < 60:
        return f"{m} minute{'s' if m != 1 else ''} ago"
    h = m // 60
    if h < 24:
        return f"{h} hour{'s' if h != 1 else ''} ago"
    d = h // 24
    if d < 7:
        return f"{d} day{'s' if d != 1 else ''} ago"
    w = d // 7
    return f"{w} week{'s' if w != 1 else ''} ago"


def bundle(u):
    con = get_db()
    prefs = con.execute("SELECT * FROM notif_prefs WHERE user_id=?", (u["id"],)).fetchone()
    return {
        "profile": profile_json(u), "settings": settings_json(u["id"]),
        "notif": {k: prefs[k] for k in NOTIF_KEYS},
        "cards": [card_json(c) for c in con.execute("SELECT * FROM cards WHERE user_id=? ORDER BY is_default DESC, id", (u["id"],))],
        "routes": [route_json(r) for r in con.execute("SELECT * FROM saved_routes WHERE user_id=? ORDER BY id", (u["id"],))],
        "blocked": [{"id": b["id"], "name": b["name"]} for b in con.execute("SELECT * FROM blocked_users WHERE user_id=?", (u["id"],))],
    }


@bp.get("/account")
@login_required
def account(u):
    return ok(**bundle(u))


# ---------------------------------------------------------------------------- profile
@bp.put("/profile")
@login_required
def update_profile(u):
    d = body()
    name, email, phone = text(d.get("name"), 80), text(d.get("email"), 120).lower(), text(d.get("phone"), 20)
    dob, gender, addr = text(d.get("dob"), 10), text(d.get("gender"), 30), text(d.get("address"), 200)
    errs = {}
    if len(name) < 2:
        errs["f_name"] = "Enter your full name"
    if not valid_email(email):
        errs["f_email"] = "Enter a valid email address"
    if not PHONE_RE.match(phone):
        errs["f_phone"] = "Enter a valid phone number"
    if d.get("dob") is not None:
        try:
            if not dob or datetime.strptime(dob, "%Y-%m-%d").date() > config.now().date():
                errs["f_dob"] = "Choose a valid birth date"
        except ValueError:
            errs["f_dob"] = "Choose a valid birth date"
    if d.get("address") is not None and len(addr) < 5:
        errs["f_address"] = "Enter your address"
    if gender and gender not in ("Male", "Female", "Other", "Prefer not to say"):
        errs["f_gender"] = "Choose an option"
    if errs:
        raise_fields(errs)
    con = get_db()
    if email != u["email"] and con.execute("SELECT 1 FROM users WHERE email=? AND id<>?", (email, u["id"])).fetchone():
        raise_fields({"f_email": "That email is used by another account"})
    con.execute("UPDATE users SET name=?,email=?,phone=?,dob=COALESCE(?,dob),gender=COALESCE(?,gender),address=COALESCE(?,address) WHERE id=?",
                (name, email, phone, dob if d.get("dob") is not None else None, gender or None,
                 addr if d.get("address") is not None else None, u["id"]))
    con.commit()
    return ok(profile=profile_json(con.execute("SELECT * FROM users WHERE id=?", (u["id"],)).fetchone()))


def raise_fields(errs):
    from .utils import ApiError
    e = ApiError("Please fix the highlighted fields.", 422)
    e.fields = errs
    raise e


# ---------------------------------------------------------------------------- cards
@bp.get("/cards")
@login_required
def cards(u):
    return ok(cards=bundle(u)["cards"])


@bp.post("/cards")
@login_required
def add_card(u):
    d = body()
    num = re.sub(r"\s", "", str(d.get("number") or ""))
    exp = re.sub(r"\s", "", str(d.get("expiry") or ""))
    holder = text(d.get("name"), 60)
    errs = {}
    brand = card_brand(num)
    if not num.isdigit() or len(num) < 13 or not luhn(num):
        errs["num"] = "Enter a valid card number"
    elif not brand:
        errs["num"] = "We accept Visa, Mastercard and RuPay"
    if not re.match(r"^[A-Za-z][A-Za-z .'-]+$", holder):
        errs["name"] = "Enter the name on the card"
    if not re.match(r"^(0[1-9]|1[0-2])/\d{2}$", exp):
        errs["exp"] = "Use MM / YY"
    elif card_expired(exp):
        errs["exp"] = "This card has expired"
    if not re.match(r"^\d{3}$", str(d.get("cvv") or "")):
        errs["cvv"] = "Enter the 3-digit CVV"
    if errs:
        raise_fields(errs)                 # NOTE: the full number and CVV are never stored
    con = get_db()
    if con.execute("SELECT 1 FROM cards WHERE user_id=? AND brand=? AND last4=?", (u["id"], brand, num[-4:])).fetchone():
        fail("This card is already saved.", 409)
    first = not con.execute("SELECT 1 FROM cards WHERE user_id=?", (u["id"],)).fetchone()
    make_default = bool(d.get("makeDefault")) or first
    if make_default:
        con.execute("UPDATE cards SET is_default=0 WHERE user_id=?", (u["id"],))
    con.execute("INSERT INTO cards(user_id,brand,last4,exp,holder,is_default,created_at) VALUES(?,?,?,?,?,?,?)",
                (u["id"], brand, num[-4:], exp, holder, int(make_default), iso(config.now())))
    con.commit()
    return ok(cards=bundle(u)["cards"], added=f"{brand} •••• {num[-4:]}"), 201


@bp.put("/cards/<int:cid>/default")
@login_required
def default_card(u, cid):
    con = get_db()
    if not con.execute("SELECT 1 FROM cards WHERE id=? AND user_id=?", (cid, u["id"])).fetchone():
        fail("Card not found.", 404)
    con.execute("UPDATE cards SET is_default=(id=?) WHERE user_id=?", (cid, u["id"]))
    con.commit()
    return ok(cards=bundle(u)["cards"])


@bp.delete("/cards/<int:cid>")
@login_required
def delete_card(u, cid):
    con = get_db()
    c = con.execute("SELECT * FROM cards WHERE id=? AND user_id=?", (cid, u["id"])).fetchone()
    if not c:
        fail("Card not found.", 404)
    con.execute("DELETE FROM cards WHERE id=?", (cid,))
    if c["is_default"]:
        con.execute("UPDATE cards SET is_default=1 WHERE id=(SELECT id FROM cards WHERE user_id=? ORDER BY id LIMIT 1)", (u["id"],))
    con.commit()
    return ok(cards=bundle(u)["cards"])


# ---------------------------------------------------------------------------- saved routes
def route_fields(d):
    name, line = text(d.get("name"), 60), text(d.get("line"), 60)
    a, b = catalog.norm_city(d.get("from")) or text(d.get("from"), 40), catalog.norm_city(d.get("to")) or text(d.get("to"), 40)
    t = text(d.get("time"), 5)
    if len(name) < 2:
        fail("Enter a route name.", 422)
    if not a or not b:
        fail("Enter both From and To.", 422)
    if a.lower() == b.lower():
        fail("Choose two different places.", 422)
    if not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", t):
        fail("Choose a departure time.", 422)
    freq = d.get("freq") if d.get("freq") in ("Daily", "Mon - Fri", "Mon - Sat", "Sat - Sun", "Fri - Sun") else "Daily"
    icon = d.get("icon") if d.get("icon") in ("home", "work", "school", "bag", "pin") else "pin"
    return name, icon, line, a, b, freq, t


@bp.get("/saved-routes")
@login_required
def routes(u):
    return ok(routes=bundle(u)["routes"])


@bp.post("/saved-routes")
@login_required
def add_route(u):
    f = route_fields(body())
    con = get_db()
    if con.execute("SELECT COUNT(*) n FROM saved_routes WHERE user_id=?", (u["id"],)).fetchone()["n"] >= 30:
        fail("You can save up to 30 routes.", 409)
    con.execute("INSERT INTO saved_routes(user_id,name,icon,line,from_city,to_city,freq,time) VALUES(?,?,?,?,?,?,?,?)", (u["id"], *f))
    con.commit()
    return ok(routes=bundle(u)["routes"]), 201


@bp.put("/saved-routes/<int:rid>")
@login_required
def edit_route(u, rid):
    d = body()
    con = get_db()
    if not con.execute("SELECT 1 FROM saved_routes WHERE id=? AND user_id=?", (rid, u["id"])).fetchone():
        fail("Route not found.", 404)
    if set(d) == {"on"}:                      # alert toggle only
        con.execute("UPDATE saved_routes SET alerts=? WHERE id=?", (1 if d["on"] else 0, rid))
    else:
        f = route_fields(d)
        con.execute("UPDATE saved_routes SET name=?,icon=?,line=?,from_city=?,to_city=?,freq=?,time=? WHERE id=?", (*f, rid))
    con.commit()
    return ok(routes=bundle(u)["routes"])


@bp.delete("/saved-routes/<int:rid>")
@login_required
def delete_route(u, rid):
    get_db().execute("DELETE FROM saved_routes WHERE id=? AND user_id=?", (rid, u["id"]))
    get_db().commit()
    return ok(routes=bundle(u)["routes"])


@bp.post("/saved-routes/alerts")
@login_required
def alerts_all(u):
    get_db().execute("UPDATE saved_routes SET alerts=? WHERE user_id=?", (1 if body().get("on", True) else 0, u["id"]))
    get_db().commit()
    return ok(routes=bundle(u)["routes"])


# ---------------------------------------------------------------------------- notifications
@bp.get("/notifications")
@login_required
def notifications(u):
    rows = get_db().execute("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC, id DESC LIMIT 100", (u["id"],)).fetchall()
    items = [{"id": r["id"], "k": r["kind"], "t": r["text"], "m": ago(r["created_at"]), "r": r["is_read"]} for r in rows]
    return ok(items=items, unread=sum(1 for i in items if not i["r"]))


@bp.post("/notifications/<int:nid>/read")
@login_required
def mark(u, nid):
    read = 1 if body().get("read", True) else 0
    get_db().execute("UPDATE notifications SET is_read=? WHERE id=? AND user_id=?", (read, nid, u["id"]))
    get_db().commit()
    return ok()


@bp.post("/notifications/read-all")
@login_required
def mark_all(u):
    get_db().execute("UPDATE notifications SET is_read=1 WHERE user_id=?", (u["id"],))
    get_db().commit()
    return ok()


@bp.put("/notification-prefs")
@login_required
def set_prefs(u):
    d = body()
    sets = [(k, 1 if d[k] else 0) for k in NOTIF_KEYS if k in d]
    if not sets:
        fail("Nothing to update.", 422)
    con = get_db()
    for k, v in sets:                          # keys come from the NOTIF_KEYS whitelist
        con.execute(f"UPDATE notif_prefs SET {k}=? WHERE user_id=?", (v, u["id"]))
    con.commit()
    return ok(notif=bundle(u)["notif"])


# ---------------------------------------------------------------------------- settings
@bp.put("/settings")
@login_required
def update_settings(u):
    d = body()
    con = get_db()
    cols = {}
    if "lang" in d:
        if d["lang"] not in LANGS:
            fail("Unknown language.", 422)
        cols["lang"] = d["lang"]
    if "units" in d:
        if d["units"] not in UNITS:
            fail("Unknown units.", 422)
        cols["units"] = d["units"]
    if "theme" in d:
        if d["theme"] not in ("light", "dark", "system"):
            fail("Unknown theme.", 422)
        cols["theme"] = d["theme"]
    for k, col in (("news", "newsletter"), ("loc", "location")):
        if k in d:
            cols[col] = 1 if d[k] else 0
    for k, col in (("usage", "priv_usage"), ("offers", "priv_offers"), ("profile", "priv_profile")):
        if k in (d.get("priv") or {}):
            cols[col] = 1 if d["priv"][k] else 0
    for col, v in cols.items():                # column names come from the whitelist above
        con.execute(f"UPDATE user_settings SET {col}=? WHERE user_id=?", (v, u["id"]))
    if "newsletter" in cols:
        if cols["newsletter"]:
            con.execute("INSERT OR IGNORE INTO newsletter(email,user_id,created_at) VALUES(?,?,?)", (u["email"], u["id"], iso(config.now())))
        else:
            con.execute("DELETE FROM newsletter WHERE email=?", (u["email"],))
    con.commit()
    return ok(settings=settings_json(u["id"]))


@bp.delete("/blocked/<int:bid>")
@login_required
def unblock(u, bid):
    get_db().execute("DELETE FROM blocked_users WHERE id=? AND user_id=?", (bid, u["id"]))
    get_db().commit()
    return ok(blocked=bundle(u)["blocked"])


# ---------------------------------------------------------------------------- newsletter (public)
@bp.post("/newsletter")
def subscribe():
    email = text(body().get("email"), 120).lower()
    rate_limit("news:" + client_ip(), 10, 3600)
    if not valid_email(email):
        fail("Enter a valid email address, like name@example.com.", 422)
    con = get_db()
    if con.execute("SELECT 1 FROM newsletter WHERE email=?", (email,)).fetchone():
        return ok(already=True, message=f"You are already subscribed with {email}.")
    u = current_user()
    con.execute("INSERT INTO newsletter(email,user_id,created_at) VALUES(?,?,?)", (email, u["id"] if u and u["email"] == email else None, iso(config.now())))
    con.commit()
    return ok(already=False, message=f"Subscribed. Offers and travel tips will go to {email}.")
