"""Small shared helpers used by every API module."""
import os
import re
import secrets
import time
from collections import defaultdict, deque
from functools import wraps

from flask import jsonify, request, session

from . import config
from .db import get_db

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
PHONE_RE = re.compile(r"^[+\d][\d\s().-]{7,17}$")
IN_MOBILE_RE = re.compile(r"^(\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$")
UPI_RE = re.compile(r"^[\w.-]{2,}@[A-Za-z][\w]{1,}$")


class ApiError(Exception):
    def __init__(self, message, status=400, field=None):
        super().__init__(message)
        self.message, self.status, self.field = message, status, field
        self.fields = None


def fail(message, status=400, field=None):
    raise ApiError(message, status, field)


def body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def text(v, maxlen=200):
    return re.sub(r"[\x00-\x08\x0b-\x1f]", "", str(v or "")).strip()[:maxlen]


def valid_email(v):
    return bool(EMAIL_RE.match(v or ""))


def password_problem(pw):
    if len(pw or "") < 8:
        return "Use at least 8 characters."
    if not re.search(r"[A-Za-z]", pw) or not re.search(r"\d", pw):
        return "Password needs letters and at least one number."
    return None


def luhn(num):
    s, alt = 0, False
    for ch in reversed(num):
        d = int(ch)
        if alt:
            d *= 2
            if d > 9:
                d -= 9
        s += d
        alt = not alt
    return s % 10 == 0


def card_brand(num):
    if re.match(r"^4", num):
        return "Visa"
    if re.match(r"^(5[1-5]|2[2-7])", num):
        return "Mastercard"
    if re.match(r"^(60|65|81|82|508)", num):
        return "RuPay"
    return ""


def card_expired(exp):
    m = re.match(r"^(0[1-9]|1[0-2])/(\d{2})$", exp or "")
    if not m:
        return True
    y, mo = 2000 + int(m.group(2)), int(m.group(1))
    n = config.now()
    return (y, mo) < (n.year, n.month)


def new_id(prefix, digits=8):
    return prefix + "".join(secrets.choice("0123456789") for _ in range(digits))


# ---------------------------------------------------------------------------- auth
def current_user():
    uid = session.get("uid")
    if not uid:
        return None
    return get_db().execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()


def login_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        u = current_user()
        if not u:
            fail("Please log in to continue.", 401)
        return fn(u, *a, **kw)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        u = current_user()
        if not u:
            fail("Please log in to continue.", 401)
        if not u["is_admin"]:
            fail("Admin access only.", 403)
        return fn(u, *a, **kw)
    return wrapper


# ---------------------------------------------------------------------------- rate limit
_hits = defaultdict(deque)


def rate_limit(key, limit, window):
    """Allow `limit` calls per `window` seconds for `key` (per process; use Redis when scaling out)."""
    if os.environ.get("TRACKB_NO_RATELIMIT"):
        return
    now = time.time()
    q = _hits[key]
    while q and q[0] < now - window:
        q.popleft()
    if len(q) >= limit:
        fail("Too many attempts. Please wait a little and try again.", 429)
    q.append(now)


def client_ip():
    return request.headers.get("X-Forwarded-For", request.remote_addr or "?").split(",")[0].strip()


def ok(**kw):
    kw.setdefault("ok", True)
    return jsonify(kw)
