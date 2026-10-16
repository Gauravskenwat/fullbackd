"""End-to-end API tests.  Run:  python -m unittest discover -s tests -v"""
import os, sys, tempfile, unittest
from datetime import datetime, timedelta

_tmp = tempfile.mkdtemp()
os.environ["TRACKB_DB"] = os.path.join(_tmp, "test.db")
os.environ["TRACKB_SEED_DEMO"] = "1"
os.environ["TRACKB_NO_RATELIMIT"] = "1"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend import create_app, config  # noqa: E402

app = create_app()
FUT = (config.now() + timedelta(days=9)).strftime("%Y-%m-%d")
while datetime.strptime(FUT, "%Y-%m-%d").weekday() not in (1, 2):      # a Tue/Wed (not weekend)
    FUT = (datetime.strptime(FUT, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")


def client():
    return app.test_client()


def login(c, email=config.DEMO_EMAIL, pw=config.DEMO_PASSWORD):
    r = c.post("/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.json
    return c


def signup(c, email, name="Test User"):
    return c.post("/api/auth/signup", json={"fullName": name, "email": email, "phone": "+91 98765 11111", "password": "Passw0rd!",
                                           "confirmPassword": "Passw0rd!", "terms": True})


UPI = {"method": "upi", "upi": "test@okbank"}


class Auth(unittest.TestCase):
    def test_signup_login_logout(self):
        c = client()
        r = signup(c, "new1@example.com")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(c.get("/api/auth/me").json["user"]["email"], "new1@example.com")
        c.post("/api/auth/logout")
        self.assertIsNone(c.get("/api/auth/me").json["user"])
        self.assertEqual(signup(client(), "new1@example.com").status_code, 409)       # duplicate
        bad = client().post("/api/auth/login", json={"email": "new1@example.com", "password": "nope"})
        self.assertEqual(bad.status_code, 401)

    def test_validation(self):
        c = client()
        r = c.post("/api/auth/signup", json={"fullName": "A", "email": "x", "phone": "1", "password": "123"})
        self.assertEqual(r.status_code, 422)
        self.assertEqual(c.get("/api/bookings").status_code, 401)

    def test_password_change_and_reset(self):
        c = client(); signup(c, "pw@example.com")
        self.assertEqual(c.post("/api/auth/password", json={"current": "wrong", "new": "Newpass12", "confirm": "Newpass12"}).status_code, 403)
        self.assertEqual(c.post("/api/auth/password", json={"current": "Passw0rd!", "new": "Newpass12", "confirm": "Newpass12"}).status_code, 200)
        c2 = client(); r = c2.post("/api/auth/forgot", json={"email": "pw@example.com"})
        token = r.json["devLink"].split("token=")[1]
        self.assertEqual(c2.post("/api/auth/reset", json={"token": token, "password": "Another123"}).status_code, 200)
        self.assertEqual(c2.post("/api/auth/reset", json={"token": token, "password": "Another123"}).status_code, 400)   # one-time
        self.assertEqual(client().post("/api/auth/login", json={"email": "pw@example.com", "password": "Another123"}).status_code, 200)


class Booking(unittest.TestCase):
    def test_search_and_seats(self):
        c = client()
        r = c.get(f"/api/search?from=Delhi&to=Manali&date={FUT}&pax=2").json
        self.assertEqual(len(r["buses"]), 5)       # 1 featured + 4 standard
        self.assertEqual(c.get(f"/api/search?from=Delhi&to=Delhi&date={FUT}").status_code, 422)
        self.assertEqual(c.get("/api/search?from=Delhi&to=Manali&date=2020-01-01").status_code, 422)
        s = c.get(f"/api/seats?from=Delhi&to=Manali&date={FUT}&bus={r['buses'][0]['code']}").json
        self.assertTrue(all(0 <= x < 40 for x in s["taken"]))

    def test_book_pay_cancel_flow(self):
        c = login(signup(client(), "flow@example.com") and client(), "flow@example.com", "Passw0rd!")
        buses = c.get(f"/api/search?from=Mumbai&to=Pune&date={FUT}").json["buses"]
        bus = next(b for b in buses if b["bookable"])
        taken = set(c.get(f"/api/seats?from=Mumbai&to=Pune&date={FUT}&bus={bus['code']}").json["taken"])
        free = [i for i in range(40) if i not in taken][:2]
        payload = dict(**{"from": "Mumbai", "to": "Pune"}, date=FUT, bus=bus["code"], pax=2, seats=free, passengerName="Flow Tester",
                       phone="+91 98765 43210", payment=UPI, coupon="TRACKB20")
        q = c.post("/api/bookings/quote", json=payload).json
        self.assertEqual(q["discount"], min(200, int(q["subtotal"] * .2)))
        r = c.post("/api/bookings", json=payload)
        self.assertEqual(r.status_code, 201, r.json)
        b = r.json["booking"]
        self.assertEqual(b["status"], "upcoming"); self.assertEqual(b["total"], q["total"])
        # same seats cannot be booked twice
        c2 = login(signup(client(), "flow2@example.com") and client(), "flow2@example.com", "Passw0rd!")
        again = c2.post("/api/bookings", json=dict(payload, coupon=""))
        self.assertEqual(again.status_code, 409)
        # TRACKB20 only on first booking
        free2 = [i for i in range(40) if i not in taken and i not in free][:1]
        second = c.post("/api/bookings", json=dict(payload, pax=1, seats=free2))
        self.assertEqual(second.status_code, 422)
        # cancel -> refund, seats released
        cq = c.post(f"/api/bookings/{b['id']}/cancel").json
        self.assertEqual(cq["booking"]["status"], "cancelled"); self.assertEqual(cq["booking"]["refund"], b["total"])
        self.assertEqual(c.post(f"/api/bookings/{b['id']}/cancel").status_code, 409)
        self.assertEqual(c2.post("/api/bookings", json=dict(payload, coupon="")).status_code, 201)     # seats free again
        self.assertIn(b["id"], c.get(f"/api/bookings/{b['id']}/receipt").get_data(as_text=True))

    def test_declined_and_invalid_payments(self):
        c = login(signup(client(), "pay@example.com") and client(), "pay@example.com", "Passw0rd!")
        bus = next(b for b in c.get(f"/api/search?from=Pune&to=Mumbai&date={FUT}").json["buses"] if b["bookable"])
        base = dict(**{"from": "Pune", "to": "Mumbai"}, date=FUT, bus=bus["code"], pax=1, seats=[39], passengerName="Pay Tester", phone="9876543210")
        bad = c.post("/api/bookings", json=dict(base, payment={"method": "card", "number": "4242424242424241", "expiry": "12/30", "cvv": "123"}))
        self.assertEqual(bad.status_code, 422)
        declined = c.post("/api/bookings", json=dict(base, payment={"method": "card", "number": "4000000000000002", "expiry": "12/30", "cvv": "123"}))
        self.assertEqual(declined.status_code, 402)
        self.assertEqual(c.get("/api/bookings").json["trips"], [])                  # nothing was booked
        ok_ = c.post("/api/bookings", json=dict(base, payment={"method": "card", "number": "4242424242424242", "expiry": "12/30", "cvv": "123"}))
        self.assertEqual(ok_.status_code, 201); self.assertEqual(ok_.json["booking"]["pay"], "Visa ending 4242")

    def test_demo_history(self):
        c = login(client())
        t = c.get("/api/bookings").json["trips"]
        self.assertEqual({x["status"] for x in t}, {"upcoming", "completed", "cancelled"})
        up = next(x for x in t if x["id"] == "SB12345678")
        self.assertTrue(up["canCancel"]); self.assertEqual(up["refundPercent"], 100)
        self.assertEqual(c.post("/api/bookings/SB12345677/rating", json={"rating": 3}).status_code, 200)
        self.assertEqual(c.post("/api/bookings/SB12345678/rating", json={"rating": 3}).status_code, 409)
        self.assertEqual(c.post("/api/bookings/SB12345677/hide").status_code, 200)
        self.assertEqual(c.get("/api/bookings").json["removed"], 1)
        c.post("/api/bookings/restore")
        self.assertEqual(c.get("/api/bookings").json["removed"], 0)
        # another user cannot see it
        o = login(signup(client(), "other@example.com") and client(), "other@example.com", "Passw0rd!")
        self.assertEqual(o.get("/api/bookings/SB12345678").status_code, 404)


class Tracking(unittest.TestCase):
    def test_demo_bus_moves_and_gps_override(self):
        c = client()
        r = c.get("/api/tracking").json
        self.assertEqual(r["state"], "running"); self.assertEqual(r["source"], "demo"); self.assertEqual(len(r["stops"]), 12)
        self.assertEqual(c.post("/api/tracking/gps", json={"bus": r["bus"]["code"], "lat": 30.7, "lng": 76.78}).status_code, 403)
        g = c.post("/api/tracking/gps", json={"bus": r["bus"]["code"], "lat": 30.7333, "lng": 76.7794, "speed": 55},
                   headers={"X-GPS-Key": config.GPS_KEY})
        self.assertEqual(g.status_code, 200)
        r2 = c.get("/api/tracking").json
        self.assertEqual(r2["source"], "gps"); self.assertAlmostEqual(r2["progress"], r2["stops"][5]["frac"], delta=.01)

    def test_booking_tracking_requires_owner(self):
        self.assertEqual(client().get("/api/tracking?booking=SB12345678").status_code, 401)
        r = login(client()).get("/api/tracking?booking=SB12345678").json
        self.assertEqual(r["state"], "scheduled"); self.assertEqual(r["bus"]["from"], "Delhi")

    def test_reviews(self):
        c = client()
        self.assertEqual(len(c.get("/api/reviews?bus=HRTC%20Volvo").json["reviews"]), 6)
        self.assertEqual(c.post("/api/reviews", json={"bus": "HRTC Volvo", "rating": 5, "text": "great ride"}).status_code, 401)
        u = login(client())
        r = u.post("/api/reviews", json={"bus": "HRTC Volvo", "rating": 5, "text": "Lovely journey all the way."})
        self.assertEqual(r.status_code, 201); self.assertEqual(r.json["review"]["v"], 1)       # verified: has a booking
        rid = r.json["review"]["id"]
        self.assertTrue(u.post(f"/api/reviews/{rid}/helpful").json["liked"])
        self.assertFalse(u.post(f"/api/reviews/{rid}/helpful").json["liked"])
        self.assertEqual(u.post("/api/reviews", json={"bus": "HRTC Volvo", "rating": 5, "text": "short"}).status_code, 422)

    def test_tickets_work_for_guests(self):
        self.assertEqual(client().post("/api/tickets", json={"kind": "emergency"}).status_code, 201)
        self.assertEqual(client().post("/api/tickets", json={"kind": "nope"}).status_code, 422)


class Parcels(unittest.TestCase):
    def test_quote_book_track_cancel(self):
        c = login(client())
        buses = c.get(f"/api/parcels/buses?from=Delhi&to=Manali&date={FUT}").json["buses"]
        q = c.post("/api/parcels/quote", json={"from": "Delhi", "to": "Manali", "date": FUT, "type": "parcel", "kg": 5, "qty": 1, "val": 2000,
                                                "bus": buses[0]["code"], "delivery": True}).json["quote"]
        self.assertEqual(q["total"], q["freight"] + q["delivery"] + q["gst"])
        body = {"from": "Delhi", "to": "Manali", "date": FUT, "type": "parcel", "kg": 5, "qty": 1, "val": 2000, "bus": buses[0]["code"],
                "delivery": True, "sender": {"n": "Aarav", "p": "9876543210"}, "recv": {"n": "Kavya", "p": "9812345678", "a": "Old Manali Road, Manali"},
                "agree": True, "payment": UPI}
        r = c.post("/api/parcels", json=body)
        self.assertEqual(r.status_code, 201, r.json)
        p = r.json["parcel"]; self.assertEqual(p["fare"], q["total"]); self.assertEqual(len(p["otp"]), 4)
        g = client().get(f"/api/parcels/{p['id']}").json["parcel"]                  # public tracking hides private data
        self.assertEqual(g["otp"], ""); self.assertNotEqual(g["recv"]["p"], "9812345678")
        self.assertEqual(c.post(f"/api/parcels/{p['id']}/cancel").json["parcel"]["stage"], -1)
        self.assertEqual(c.post("/api/parcels", json=dict(body, agree=False)).status_code, 422)
        self.assertEqual(c.post("/api/parcels", json=dict(body, kg=999)).status_code, 422)
        self.assertEqual(client().get("/api/parcels/TB99999999").status_code, 404)
        self.assertGreaterEqual(len(c.get("/api/parcels").json["parcels"]), 3)


class Account(unittest.TestCase):
    def setUp(self):
        self.c = login(signup(client(), f"acc{id(self)}@example.com") and client(), f"acc{id(self)}@example.com", "Passw0rd!")

    def test_profile_cards_routes_prefs(self):
        c = self.c
        self.assertEqual(c.put("/api/profile", json={"name": "A", "email": "bad", "phone": "x"}).status_code, 422)
        self.assertEqual(c.put("/api/profile", json={"name": "New Name", "email": c.get("/api/account").json["profile"]["email"], "phone": "+91 99999 88888"}).status_code, 200)
        card = {"number": "4242 4242 4242 4242", "name": "New Name", "expiry": "12/30", "cvv": "123"}
        r = c.post("/api/cards", json=card); self.assertEqual(r.status_code, 201)
        self.assertTrue(r.json["cards"][0]["d"]); self.assertNotIn("4242424242424242", str(c.get("/api/account").json))
        self.assertEqual(c.post("/api/cards", json=card).status_code, 409)
        self.assertEqual(c.post("/api/cards", json=dict(card, number="5555 5555 5555 4444")).status_code, 201)
        cid = c.get("/api/cards").json["cards"][1]["id"]
        self.assertEqual(c.put(f"/api/cards/{cid}/default").json["cards"][0]["id"], cid)
        c.delete(f"/api/cards/{cid}"); self.assertEqual(len(c.get("/api/cards").json["cards"]), 1)
        rt = {"name": "Home trip", "from": "Delhi", "to": "Shimla", "time": "08:00", "freq": "Daily", "line": "HRTC Volvo", "icon": "home"}
        self.assertEqual(c.post("/api/saved-routes", json=rt).status_code, 201)
        rid = c.get("/api/saved-routes").json["routes"][0]["id"]
        self.assertEqual(c.put(f"/api/saved-routes/{rid}", json={"on": 0}).json["routes"][0]["on"], 0)
        self.assertEqual(c.put("/api/notification-prefs", json={"promo": 1}).json["notif"]["promo"], 1)
        self.assertEqual(c.put("/api/settings", json={"theme": "dark", "lang": "हिन्दी"}).json["settings"]["theme"], "dark")
        self.assertEqual(c.put("/api/settings", json={"theme": "pink"}).status_code, 422)

    def test_unblock_and_default_settings(self):
        c = login(client())
        blocked = c.get("/api/account").json["blocked"]
        self.assertEqual(len(blocked), 3)
        self.assertEqual(len(c.delete(f"/api/blocked/{blocked[0]['id']}").json["blocked"]), 2)
        self.assertEqual(c.put("/api/settings", json={"priv": {"offers": True}, "loc": True}).json["settings"]["priv"]["offers"], 1)

    def test_notifications(self):
        c = self.c
        n = c.get("/api/notifications").json
        self.assertGreaterEqual(len(n["items"]), 1)         # welcome message
        c.post("/api/notifications/read-all"); self.assertEqual(c.get("/api/notifications").json["unread"], 0)

    def test_delete_account(self):
        self.assertEqual(self.c.post("/api/auth/delete", json={"confirm": "no"}).status_code, 422)
        self.assertEqual(self.c.post("/api/auth/delete", json={"confirm": "DELETE"}).status_code, 200)
        self.assertEqual(self.c.get("/api/account").status_code, 401)


class Public(unittest.TestCase):
    def test_newsletter_contact_chat_departures(self):
        c = client()
        self.assertEqual(c.post("/api/newsletter", json={"email": "bad"}).status_code, 422)
        self.assertFalse(c.post("/api/newsletter", json={"email": "sub@example.com"}).json["already"])
        self.assertTrue(c.post("/api/newsletter", json={"email": "sub@example.com"}).json["already"])
        self.assertEqual(c.post("/api/contact", json={"name": "X", "email": "x@example.com", "message": "Hello there", "topic": "booking"}).status_code, 201)
        self.assertEqual(c.post("/api/contact", json={"name": "", "email": "x", "message": ""}).status_code, 422)
        self.assertIn("Cancel", c.post("/api/chat", json={"message": "how do I cancel?"}).json["reply"])
        self.assertEqual(c.post("/api/chat", json={"message": "Delhi to Manali"}).json["actions"][0]["search"]["to"], "Manali")
        self.assertIn("log in", c.post("/api/chat", json={"message": "status of SB12345678"}).json["reply"].lower())
        self.assertEqual(len(c.get("/api/departures").json["departures"]), 5)
        self.assertEqual(len(c.get("/api/offers").json["offers"]), 5)

    def test_static_files_and_privacy(self):
        c = client()
        self.assertEqual(c.get("/").status_code, 200)
        self.assertEqual(c.get("/services/").status_code, 200)
        self.assertEqual(c.get("/backend/config.py").status_code, 404)
        self.assertEqual(c.get("/instance/test.db").status_code, 404)
        self.assertEqual(c.get("/.env").status_code, 404)
        self.assertEqual(c.get("/../run.py").status_code, 404)
        self.assertEqual(c.get("/README.md").status_code, 404)

    def test_admin_only(self):
        self.assertEqual(client().get("/api/admin/stats").status_code, 401)
        self.assertEqual(login(client()).get("/api/admin/stats").status_code, 403)
        a = login(client(), config.ADMIN_EMAIL, config.ADMIN_PASSWORD)
        self.assertGreater(a.get("/api/admin/stats").json["stats"]["users"], 0)
        self.assertEqual(a.post("/api/admin/parcels/TB10000001/stage", json={"stage": 5}).status_code, 200)
        self.assertEqual(client().get("/api/parcels/TB10000001").json["parcel"]["stage"], 5)

    def test_team_photo_admin_only(self):
        png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        self.assertEqual(login(client()).post("/api/team/gaurav/photo", json={"image": png}).status_code, 403)
        a = login(client(), config.ADMIN_EMAIL, config.ADMIN_PASSWORD)
        self.assertEqual(a.post("/api/team/gaurav/photo", json={"image": "data:image/png;base64,AAAA"}).status_code, 422)
        r = a.post("/api/team/gaurav/photo", json={"image": png}); self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json["team"][0]["photo"].startswith("/media/team/gaurav.png"))
        self.assertEqual(client().get(r.json["team"][0]["photo"]).status_code, 200)


if __name__ == "__main__":
    unittest.main()
