"""Payment processing.

This module validates the payment details and records a payment, but the "gateway" itself is a
simulator: nothing is charged. To go live, replace `_gateway_charge()` with a call to Razorpay /
Cashfree / Stripe and keep the rest of the flow (the front end never sends card data anywhere else).
Full card numbers and CVVs are validated and then discarded - they are never stored or logged.
"""
import re
import secrets

from . import config
from .db import connect_standalone, get_db, iso
from .utils import UPI_RE, card_brand, card_expired, fail, luhn

BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank"]


def resolve(user_id, pay):
    """Validate the client's payment block. Returns (method, label, details) or raises ApiError."""
    pay = pay if isinstance(pay, dict) else {}
    method = pay.get("method")
    if method == "upi":
        upi = (pay.get("upi") or "").strip()
        if not UPI_RE.match(upi):
            fail("Enter a valid UPI ID, like name@bank.", 422, "upi")
        return "upi", f"UPI {upi}", {}
    if method == "card":
        num = re.sub(r"\s", "", str(pay.get("number") or ""))
        if not num.isdigit() or not 13 <= len(num) <= 19 or not luhn(num):
            fail("Enter a valid card number.", 422, "number")
        if not card_brand(num):
            fail("We accept Visa, Mastercard and RuPay cards.", 422, "number")
        exp = re.sub(r"\s", "", str(pay.get("expiry") or ""))
        if not re.match(r"^(0[1-9]|1[0-2])/\d{2}$", exp):
            fail("Expiry must be MM/YY.", 422, "expiry")
        if card_expired(exp):
            fail("This card has expired.", 422, "expiry")
        if not re.match(r"^\d{3}$", str(pay.get("cvv") or "")):
            fail("Enter the 3-digit CVV.", 422, "cvv")
        return "card", f"{card_brand(num)} ending {num[-4:]}", {"last4": num[-4:]}
    if method == "saved":
        card = get_db().execute("SELECT * FROM cards WHERE id=? AND user_id=?", (pay.get("cardId"), user_id)).fetchone()
        if not card:
            fail("That saved card was not found.", 404, "cardId")
        if card_expired(card["exp"]):
            fail("That saved card has expired.", 422, "cardId")
        if not re.match(r"^\d{3}$", str(pay.get("cvv") or "")):
            fail("Enter the 3-digit CVV of your saved card.", 422, "cvv")
        return "card", f"{card['brand']} ending {card['last4']}", {"last4": card["last4"]}
    if method == "net":
        bank = pay.get("bank")
        if bank not in BANKS:
            fail("Choose your bank.", 422, "bank")
        return "net", f"Net banking – {bank}", {}
    fail("Choose a payment method.", 422, "method")


def _gateway_charge(amount, method, details):
    """Simulated gateway. Replace with a real provider call. Cards ending 0002 are declined (test rule)."""
    if details.get("last4") == "0002":
        return False, ""
    return True, "TXN" + secrets.token_hex(5).upper()


def charge(user_id, kind, ref_id, amount, pay):
    """Validate + run the gateway. Returns (method, label, txn_ref) on success; raises ApiError(402) on decline.
    The caller stores the successful payment with record() inside its own transaction."""
    method, label, details = resolve(user_id, pay)
    approved, txn = _gateway_charge(amount, method, details)
    if not approved:
        con = connect_standalone()      # keep the decline on record even though the caller rolls back
        con.execute("INSERT INTO payments(user_id,kind,ref_id,amount,method,label,status,txn_ref,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                    (user_id, kind, ref_id, amount, method, label, "declined", "", iso(config.now())))
        con.commit()
        con.close()
        fail("Your bank declined this payment. Try another card or payment method.", 402)
    return method, label, txn


def record(con, user_id, kind, ref_id, amount, method, label, txn):
    con.execute("INSERT INTO payments(user_id,kind,ref_id,amount,method,label,status,txn_ref,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (user_id, kind, ref_id, amount, method, label, "success", txn, iso(config.now())))
