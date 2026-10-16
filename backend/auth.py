"""Accounts and sessions."""
import hashlib
import secrets
from datetime import timedelta

from flask import Blueprint, session
from werkzeug.security import check_password_hash, generate_password_hash

from . import config
from .db import create_user, get_db, iso, notify
from .utils import (body, client_ip, current_user, fail, login_required, ok, password_problem, PHONE_RE, rate_limit,
                    text, valid_email)

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def public_user(u):
    s = get_db().execute("SELECT * FROM user_settings WHERE user_id=?", (u["id"],)).fetchone()
    return {"id": u["id"], "name": u["name"], "email": u["email"], "phone": u["phone"], "verified": bool(u["verified"]),
            "isAdmin": bool(u["is_admin"]), "theme": s["theme"] if s else "system",
            "initials": "".join(p[0] for p in u["name"].split()[:2]).upper()}


@bp.get("/me")
def me():
    u = current_user()
    return ok(user=public_user(u) if u else None)


@bp.post("/signup")
def signup():
    d = body()
    rate_limit("signup:" + client_ip(), 10, 3600)
    name, email, phone = text(d.get("fullName") or d.get("name"), 80), text(d.get("email"), 120).lower(), text(d.get("phone"), 20)
    pw = d.get("password") or ""
    if len(name) < 2:
        fail("Please enter your full name.", 422, "fullName")
    if not valid_email(email):
        fail("Enter a valid email address.", 422, "email")
    if not PHONE_RE.match(phone):
        fail("Enter a valid phone number.", 422, "phone")
    problem = password_problem(pw)
    if problem:
        fail(problem, 422, "password")
    if d.get("confirmPassword") is not None and d.get("confirmPassword") != pw:
        fail("Passwords do not match.", 422, "confirmPassword")
    if not d.get("terms"):
        fail("Please accept the terms to continue.", 422, "terms")
    con = get_db()
    if con.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
        fail("An account with this email already exists. Try logging in.", 409, "email")
    uid = create_user(con, name, email, phone, pw)
    notify(con, uid, "system", "Welcome to TrackB! Use code TRACKB20 for 20% off your first booking.", force=True)
    con.commit()
    session.clear()
    session["uid"] = uid
    session.permanent = True
    return ok(user=public_user(current_user())), 201


@bp.post("/login")
def login():
    d = body()
    email, pw = text(d.get("email"), 120).lower(), d.get("password") or ""
    rate_limit("login:" + client_ip(), 20, 600)
    rate_limit("login-user:" + email, 8, 600)
    if not valid_email(email) or not pw:
        fail("Enter your email and password.", 422)
    u = get_db().execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not u or not check_password_hash(u["password_hash"], pw):
        fail("Email or password is incorrect.", 401)
    session.clear()
    session["uid"] = u["id"]
    session.permanent = bool(d.get("remember", True))
    return ok(user=public_user(u))


@bp.post("/logout")
def logout():
    session.clear()
    return ok()


@bp.post("/password")
@login_required
def change_password(u):
    d = body()
    if not check_password_hash(u["password_hash"], d.get("current") or ""):
        fail("Your current password is incorrect.", 403, "current")
    new = d.get("new") or ""
    problem = password_problem(new)
    if problem:
        fail(problem, 422, "new")
    if new == d.get("current"):
        fail("Choose a different password.", 422, "new")
    if new != d.get("confirm"):
        fail("Passwords do not match.", 422, "confirm")
    con = get_db()
    con.execute("UPDATE users SET password_hash=? WHERE id=?", (generate_password_hash(new), u["id"]))
    notify(con, u["id"], "system", "Your password was updated successfully.", force=True)
    con.commit()
    return ok()


@bp.post("/forgot")
def forgot():
    """Create a one-time reset link. Without an e-mail service it is returned in the response
    (development) and printed to the server console; wire send_mail() to your SMTP provider for production."""
    d = body()
    email = text(d.get("email"), 120).lower()
    rate_limit("forgot:" + client_ip(), 5, 3600)
    if not valid_email(email):
        fail("Enter a valid email address.", 422, "email")
    con = get_db()
    u = con.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
    link = None
    if u:
        token = secrets.token_urlsafe(32)
        con.execute("INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES(?,?,?)",
                    (hashlib.sha256(token.encode()).hexdigest(), u["id"], iso(config.now() + timedelta(hours=1))))
        con.commit()
        link = f"/trackb-signup/index.html?mode=reset&token={token}"
        print(f"[trackb] password reset link for {email}: {link}")
    resp = {"message": "If that email has an account, a reset link has been sent."}
    if not config.PRODUCTION and link:
        resp["devLink"] = link
    return ok(**resp)


@bp.post("/reset")
def reset():
    d = body()
    token, new = d.get("token") or "", d.get("password") or ""
    problem = password_problem(new)
    if problem:
        fail(problem, 422, "password")
    con = get_db()
    row = con.execute("SELECT * FROM password_resets WHERE token_hash=? AND used=0",
                      (hashlib.sha256(token.encode()).hexdigest(),)).fetchone()
    if not row or row["expires_at"] < iso(config.now()):
        fail("This reset link is invalid or has expired.", 400)
    con.execute("UPDATE users SET password_hash=? WHERE id=?", (generate_password_hash(new), row["user_id"]))
    con.execute("UPDATE password_resets SET used=1 WHERE token_hash=?", (row["token_hash"],))
    notify(con, row["user_id"], "system", "Your password was reset successfully.", force=True)
    con.commit()
    return ok()


@bp.post("/social")
def social():
    fail("Social sign-in is not configured on this server yet. Add OAuth credentials in backend/auth.py.", 501)


@bp.post("/delete")
@login_required
def delete_account(u):
    d = body()
    if d.get("confirm") != "DELETE":
        fail("Type DELETE to confirm.", 422)
    if u["is_admin"]:
        fail("The admin account cannot be deleted here.", 403)
    con = get_db()
    con.execute("DELETE FROM newsletter WHERE user_id=?", (u["id"],))
    con.execute("DELETE FROM users WHERE id=?", (u["id"],))     # cascades to bookings, cards, routes, ...
    con.commit()
    session.clear()
    return ok()
