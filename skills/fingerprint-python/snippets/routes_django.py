# Django — the gate on each sensitive endpoint. Wire one first (login), verify, then add the rest.
import json
from functools import wraps

from django.http import JsonResponse
from django.urls import path
from django.views.decorators.http import require_POST

from .verify import verify_event


def require_verified_event(view):
    """Decorator: verify the event_id in the JSON body; on success request.visitor_id is the trusted id."""

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        try:
            body = json.loads(request.body or b"{}")
        except ValueError:
            body = {}
        check = verify_event(body.get("event_id"))
        if not check["ok"]:
            return JsonResponse({"error": "blocked", "reason": check["reason"]}, status=403)
        request.visitor_id = check["visitor_id"]
        return view(request, *args, **kwargs)

    return wrapper


# Start with the one the user wants to see first (login), then offer the others that exist in the
# app. Route names differ per codebase — a login can be POST /sessions and a signup POST /users —
# so match on what the handler does.
# (Add @csrf_exempt only for endpoints your JSON client genuinely can't send the CSRF token to.)


@require_POST
@require_verified_event
def login(request):
    # ...check credentials. Bind request.visitor_id to the account on its first trusted login; when
    # the account has never been seen from this visitor_id, step up (email / OTP) instead.
    return JsonResponse({"ok": True})


@require_POST
@require_verified_event
def signup(request):
    # ...refuse (or flag for review) when an account already exists for request.visitor_id, then
    # create the account and store the visitor_id on it.
    return JsonResponse({"ok": True}, status=201)


@require_POST
@require_verified_event
def password_reset(request):
    # ...cap reset / OTP sends per request.visitor_id (e.g. 5 per 24 h), then send.
    return JsonResponse({"ok": True})


@require_POST
@require_verified_event
def checkout(request):
    # ...cap orders per request.visitor_id per day (card testing), store the visitor_id on the order
    # (chargeback evidence), then charge.
    return JsonResponse({"ok": True})


@require_POST
@require_verified_event
def redeem_coupon(request):
    # ...refuse when request.visitor_id already redeemed the code, then apply the coupon.
    return JsonResponse({"ok": True})


urlpatterns = [
    path("api/login", login),
    path("api/signup", signup),
    path("api/password-reset", password_reset),
    path("api/checkout", checkout),
    path("api/coupons/redeem", redeem_coupon),
]
