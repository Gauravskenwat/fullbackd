"""Start the TrackB website + API:  python run.py   (then open http://localhost:8000)"""
import os
from backend import create_app, config

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"\n  TrackB is running at http://localhost:{port}")
    if config.SEED_DEMO:
        print(f"  Demo traveller : {config.DEMO_EMAIL} / {config.DEMO_PASSWORD}")
    print(f"  Admin panel    : http://localhost:{port}/admin/   ({config.ADMIN_EMAIL} / {config.ADMIN_PASSWORD})\n")
    app.run(host=os.environ.get("HOST", "127.0.0.1"), port=port, debug=not config.PRODUCTION, use_reloader=False)
