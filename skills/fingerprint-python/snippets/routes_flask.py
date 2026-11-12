# Flask — add the gate to every sensitive endpoint, not just login.
from functools import wraps

from flask import Blueprint, g, request

from .verify import verify_event

bp = Blueprint("protected", __name__)


def require_verified_event(view):
    """Decorator: verify the event_id in the JSON body; on success g.visitor_id is the trusted id."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        body = request.get_json(silent=True) or {}
        check = verify_event(body.get("event_id"))
        if not check["ok"]:
            return {"error": "blocked", "reason": check["reason"]}, 403
        g.visitor_id = check["visitor_id"]
        return view(*args, **kwargs)

    return wrapper


# Wire the decorator onto each of these that exists in the app. Route names differ per codebase —
# a login can be POST /sessions and a signup POST /users — so match on what the handler does.


@bp.post("/api/login")
@require_verified_event
def login():
    # ...check credentials. Bind g.visitor_id to the account on its first trusted login; when the
    # account has never been seen from this visitor_id, step up (email / OTP) instead of letting it in.
    return {"ok": True}


@bp.post("/api/signup")
@require_verified_event
def signup():
    # ...refuse (or flag for review) when an account already exists for g.visitor_id, then create
    # the account and store the visitor_id on it.
    return {"ok": True}, 201


@bp.post("/api/password-reset")
@require_verified_event
def password_reset():
    # ...cap reset / OTP sends per g.visitor_id (e.g. 5 per 24 h), then send.
    return {"ok": True}


@bp.post("/api/checkout")
@require_verified_event
def checkout():
    # ...cap orders per g.visitor_id per day (card testing), store the visitor_id on the order
    # (chargeback evidence), then charge.
    return {"ok": True}


@bp.post("/api/coupons/redeem")
@require_verified_event
def redeem_coupon():
    # ...refuse when g.visitor_id already redeemed request.json["code"], then apply the coupon.
    return {"ok": True}
