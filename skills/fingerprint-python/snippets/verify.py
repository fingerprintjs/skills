# Server-side verification of an event_id sent by the frontend. Returns a trust decision.
import time

from fingerprint_server_sdk import BotResult

from .client import client

MAX_AGE_MS = 2 * 60 * 1000  # reject identifications older than 2 minutes (replay protection)
MIN_CONFIDENCE = 0.9  # minimum identification confidence to trust the action


def verify_event(event_id):
    if not event_id:
        return {"ok": False, "reason": "missing_event_id"}

    try:
        event = client.get_event(event_id)
    except Exception:
        return {"ok": False, "reason": "lookup_failed"}  # fail closed for sensitive actions

    ident = event.identification
    if not ident or not ident.visitor_id:
        return {"ok": False, "reason": "not_found"}

    # Replay / freshness — `replayed` and `timestamp` are root-level on the event, not on identification
    if event.replayed:
        return {"ok": False, "reason": "replayed"}
    if time.time() * 1000 - event.timestamp > MAX_AGE_MS:
        return {"ok": False, "reason": "stale"}

    # Identification confidence
    if (ident.confidence.score if ident.confidence else 0) < MIN_CONFIDENCE:
        return {"ok": False, "reason": "low_confidence"}

    # Smart signals (fail closed for high-risk actions)
    if event.bot and event.bot != BotResult.NOT_DETECTED:
        return {"ok": False, "reason": "bot"}
    if event.vpn or event.proxy:
        return {"ok": False, "reason": "anonymizing_network"}
    if event.tampering:
        return {"ok": False, "reason": "tampering"}

    return {"ok": True, "visitor_id": ident.visitor_id}


# Wire this into every sensitive endpoint (login, signup, password reset, checkout, coupon
# redemption) — see routes_fastapi.py, routes_flask.py or routes_django.py for the full route list.
