"""Back-office API (admin account only): stats, inbox, tickets, parcels, bookings, newsletter."""
from flask import Blueprint, Response

from . import config
from .db import get_db
from .utils import admin_required, body, fail, ok

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def rows(sql, args=()):
    return [dict(r) for r in get_db().execute(sql, args).fetchall()]


@bp.get("/stats")
@admin_required
def stats(u):
    q = lambda sql: get_db().execute(sql).fetchone()[0] or 0
    return ok(stats={
        "users": q("SELECT COUNT(*) FROM users WHERE is_admin=0"),
        "bookings": q("SELECT COUNT(*) FROM bookings WHERE cancelled=0"),
        "revenue": q("SELECT SUM(amount) FROM bookings WHERE cancelled=0") + q("SELECT SUM(fare) FROM parcels WHERE cancelled=0"),
        "parcels": q("SELECT COUNT(*) FROM parcels WHERE cancelled=0"),
        "newMessages": q("SELECT COUNT(*) FROM contact_messages WHERE status='new'"),
        "openTickets": q("SELECT COUNT(*) FROM tickets WHERE status='open'"),
        "subscribers": q("SELECT COUNT(*) FROM newsletter"),
        "gpsBuses": q("SELECT COUNT(*) FROM bus_positions"),
    })


@bp.get("/messages")
@admin_required
def messages(u):
    return ok(items=rows("SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200"))


@bp.post("/messages/<mid>/status")
@admin_required
def message_status(u, mid):
    st = body().get("status")
    if st not in ("new", "replied", "closed"):
        fail("Unknown status.", 422)
    get_db().execute("UPDATE contact_messages SET status=? WHERE id=?", (st, mid))
    get_db().commit()
    return ok()


@bp.get("/tickets")
@admin_required
def tickets(u):
    return ok(items=rows("SELECT * FROM tickets ORDER BY created_at DESC LIMIT 200"))


@bp.post("/tickets/<tid>/status")
@admin_required
def ticket_status(u, tid):
    st = body().get("status")
    if st not in ("open", "resolved"):
        fail("Unknown status.", 422)
    get_db().execute("UPDATE tickets SET status=? WHERE id=?", (st, tid))
    get_db().commit()
    return ok()


@bp.get("/bookings")
@admin_required
def bookings(u):
    return ok(items=rows("SELECT b.id,b.from_city,b.to_city,b.travel_date,b.operator,b.seats,b.amount,b.cancelled,b.pay_label,"
                         "u.name,u.email FROM bookings b JOIN users u ON u.id=b.user_id ORDER BY b.created_at DESC LIMIT 200"))


@bp.get("/parcels")
@admin_required
def parcels(u):
    from .parcels import stage_of
    out = []
    for r in get_db().execute("SELECT p.*,u.email FROM parcels p JOIN users u ON u.id=p.user_id ORDER BY created_ts DESC LIMIT 200"):
        out.append({"id": r["id"], "from": r["from_city"], "to": r["to_city"], "operator": r["operator"], "fare": r["fare"],
                    "email": r["email"], "stage": stage_of(r), "cancelled": r["cancelled"]})
    return ok(items=out)


@bp.post("/parcels/<pid>/stage")
@admin_required
def parcel_stage(u, pid):
    st = body().get("stage")
    if not isinstance(st, int) or not 0 <= st <= 5:
        fail("Stage must be 0 to 5.", 422)
    get_db().execute("UPDATE parcels SET stage_override=? WHERE id=? AND cancelled=0", (st, pid))
    get_db().commit()
    return ok()


@bp.get("/newsletter")
@admin_required
def newsletter(u):
    return ok(items=rows("SELECT email,created_at FROM newsletter ORDER BY created_at DESC"))


@bp.get("/newsletter.csv")
@admin_required
def newsletter_csv(u):
    data = "email,subscribed_at\n" + "\n".join(f"{r['email']},{r['created_at']}" for r in rows("SELECT * FROM newsletter"))
    return Response(data, mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=newsletter.csv"})
