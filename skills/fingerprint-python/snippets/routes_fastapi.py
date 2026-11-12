# FastAPI — add the gate to every sensitive endpoint, not just login.
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .verify import verify_event

router = APIRouter()


class ProtectedRequest(BaseModel):
    event_id: str  # the single-use event_id from the frontend's getData(); a request without one
    # fails validation (422) before the handler runs, so the gate can't be skipped


def require_verified(event_id: str) -> str:
    """Verify the event_id and return the trusted visitor_id, or reject the request (403)."""
    check = verify_event(event_id)
    if not check["ok"]:
        raise HTTPException(status_code=403, detail={"error": "blocked", "reason": check["reason"]})
    return check["visitor_id"]


# Each sensitive request model extends ProtectedRequest so it carries event_id. Wire require_verified
# into each of these that exists in the app. Route names differ per codebase — a login can be
# POST /sessions and a signup POST /users — so match on what the handler does.


class LoginRequest(ProtectedRequest):
    email: str
    password: str


@router.post("/api/login")
async def login(req: LoginRequest):
    visitor_id = require_verified(req.event_id)
    # ...check credentials. Bind visitor_id to the account on its first trusted login; when the
    # account has never been seen from this visitor_id, step up (email / OTP) instead of letting it in.
    return {"ok": True}


class SignupRequest(ProtectedRequest):
    email: str
    password: str


@router.post("/api/signup", status_code=201)
async def signup(req: SignupRequest):
    visitor_id = require_verified(req.event_id)
    # ...refuse (or flag for review) when an account already exists for visitor_id, then create the
    # account and store visitor_id on it.
    return {"ok": True}


class PasswordResetRequest(ProtectedRequest):
    email: str


@router.post("/api/password-reset")
async def password_reset(req: PasswordResetRequest):
    visitor_id = require_verified(req.event_id)
    # ...cap reset / OTP sends per visitor_id (e.g. 5 per 24 h), then send.
    return {"ok": True}


class CheckoutRequest(ProtectedRequest):
    cart_id: str


@router.post("/api/checkout")
async def checkout(req: CheckoutRequest):
    visitor_id = require_verified(req.event_id)
    # ...cap orders per visitor_id per day (card testing), store visitor_id on the order (chargeback
    # evidence), then charge.
    return {"ok": True}


class RedeemCouponRequest(ProtectedRequest):
    code: str


@router.post("/api/coupons/redeem")
async def redeem_coupon(req: RedeemCouponRequest):
    visitor_id = require_verified(req.event_id)
    # ...refuse when this visitor_id already redeemed req.code, then apply the coupon.
    return {"ok": True}
