"""TrackB / SmartBus backend: Flask + SQLite. Serves the website and the JSON API under /api."""
import mimetypes
from datetime import timedelta

from flask import Flask, jsonify, request, send_from_directory, abort

from . import config
from .db import close_db, init_db
from .utils import ApiError

# Only these top-level paths of the project folder are public. Everything else (backend/, instance/, .env, ...) is private.
PUBLIC_DIRS = {"assets", "shared", "tracking", "services", "history", "delivery", "profile", "developers",
               "trackb-signup", "pages", "admin"}
PUBLIC_FILES = {"index.html", "theme.js", "favicon.ico"}


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.update(
        SECRET_KEY=config.secret_key(),
        SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_SECURE=config.PRODUCTION,
        PERMANENT_SESSION_LIFETIME=timedelta(days=30), MAX_CONTENT_LENGTH=4 * 1024 * 1024, JSON_SORT_KEYS=False)
    init_db()
    app.teardown_appcontext(close_db)

    from . import account, admin, auth, bookings, parcels, support, tracking
    for m in (auth, bookings, tracking, parcels, account, support, admin):
        app.register_blueprint(m.bp)

    # ------------------------------------------------------------------ errors + security
    @app.errorhandler(ApiError)
    def api_error(e):
        resp = {"ok": False, "error": e.message}
        if e.field:
            resp["field"] = e.field
        if e.fields:
            resp["fields"] = e.fields
        return jsonify(resp), e.status

    @app.errorhandler(404)
    def not_found(_):
        if request.path.startswith("/api/"):
            return jsonify(ok=False, error="Not found."), 404
        return send_from_directory(config.ROOT, "index.html"), 404

    @app.errorhandler(405)
    def bad_method(_):
        return jsonify(ok=False, error="Method not allowed."), 405

    @app.errorhandler(413)
    def too_big(_):
        return jsonify(ok=False, error="That upload is too large."), 413

    @app.errorhandler(Exception)
    def crash(e):
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            return e
        app.logger.exception("Unhandled error")
        return jsonify(ok=False, error="Something went wrong on our side. Please try again."), 500

    @app.before_request
    def csrf_guard():
        """State-changing API calls must be same-origin JSON (blocks cross-site form posts)."""
        if request.method in ("POST", "PUT", "DELETE") and request.path.startswith("/api/") and request.path != "/api/tracking/gps":
            origin = request.headers.get("Origin")
            if origin and origin.split("://", 1)[-1] != request.host:
                return jsonify(ok=False, error="Cross-site request blocked."), 403

    @app.after_request
    def headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        if request.path.startswith("/api/"):
            resp.headers["Cache-Control"] = "no-store"
        elif request.path.endswith((".html", ".js", ".css")) or request.path == "/":
            resp.headers["Cache-Control"] = "no-cache"
        return resp

    # ------------------------------------------------------------------ website files
    @app.get("/media/team/<path:name>")
    def team_media(name):
        return send_from_directory(config.UPLOAD_DIR / "team", name)

    @app.get("/healthz")
    def health():
        return jsonify(ok=True)

    @app.get("/", defaults={"path": "index.html"})
    @app.get("/<path:path>")
    def site(path):
        parts = path.split("/")
        if parts[0] not in PUBLIC_DIRS and path not in PUBLIC_FILES:
            abort(404)
        if any(p.startswith(".") for p in parts):
            abort(404)
        target = (config.ROOT / path).resolve()
        if config.ROOT not in target.parents and target != config.ROOT:
            abort(404)
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            abort(404)
        if target.suffix in (".md", ".py", ".db"):
            abort(404)
        return send_from_directory(target.parent, target.name, mimetype=mimetypes.guess_type(target.name)[0])

    return app
