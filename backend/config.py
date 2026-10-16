"""Settings, read from environment variables (and an optional .env file)."""
import os
from datetime import timedelta, timezone, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _load_dotenv():
    f = ROOT / ".env"
    if not f.exists():
        return
    for line in f.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.split("#", 1)[0].strip() if not v.strip().startswith(("'", '"')) else v.strip().strip("'\"")
        os.environ.setdefault(k.strip(), v)


_load_dotenv()


def _flag(name, default="1"):
    return os.environ.get(name, default).strip().lower() in ("1", "true", "yes", "on")


ENV = os.environ.get("TRACKB_ENV", "development")
PRODUCTION = ENV == "production"
DB_PATH = Path(os.environ.get("TRACKB_DB", str(ROOT / "instance" / "trackb.db")))
if not DB_PATH.is_absolute():
    DB_PATH = ROOT / DB_PATH
ADMIN_EMAIL = os.environ.get("TRACKB_ADMIN_EMAIL", "admin@trackb.in").lower()
ADMIN_PASSWORD = os.environ.get("TRACKB_ADMIN_PASSWORD", "Admin@1234")
GPS_KEY = os.environ.get("TRACKB_GPS_KEY", "change-me-gps-key")
DEMO_FLEET = _flag("TRACKB_DEMO_FLEET")
PARCEL_DEMO = _flag("TRACKB_PARCEL_DEMO_MINUTES")
SEED_DEMO = _flag("TRACKB_SEED_DEMO")
UPLOAD_DIR = ROOT / "instance" / "uploads"
MAX_UPLOAD = 2 * 1024 * 1024

DEMO_EMAIL = "aarav.mehta@gmail.com"
DEMO_PASSWORD = "Demo@1234"

IST = timezone(timedelta(hours=5, minutes=30))


def now():
    """Current time in India (all trip times are local India time)."""
    return datetime.now(IST).replace(tzinfo=None, microsecond=0)


def secret_key():
    k = os.environ.get("TRACKB_SECRET_KEY")
    if k:
        return k
    f = ROOT / "instance" / "secret.key"
    f.parent.mkdir(exist_ok=True)
    if not f.exists():
        f.write_text(os.urandom(32).hex())
    return f.read_text().strip()


# Cancellation refund tiers: (minimum hours before departure, % refunded)
REFUND_TIERS = [(24, 100), (6, 75), (2, 50)]   # under 2 hours -> 0 %
