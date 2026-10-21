# Server-side verification of an event_id sent by the frontend. Returns a trust decision.
import logging
import time

from fingerprint_server_sdk import BotResult

from .client import client

log = logging.getLogger("fingerprint")

MAX_AGE_MS = 2 * 60 * 1000  # reject identifications older than 2 minutes (replay protection)
MIN_CONFIDENCE = 0.9  # minimum identification confidence to trust the action
ENFORCE_SIGNALS = False  # log-only at first; set True once the warnings look right for your traffic


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

    # Identification confidence and Smart Signals
    flags = []
    if (ident.confidence.score if ident.confidence else 0) < MIN_CONFIDENCE:
        flags.append("low_confidence")
    if event.bot and event.bot != BotResult.NOT_DETECTED:
        flags.append("bot")
    if event.vpn or event.proxy:
        flags.append("anonymizing_network")
    if event.tampering:
        flags.append("tampering")
    if flags:
        if ENFORCE_SIGNALS:
            return {"ok": False, "reason": ",".join(flags)}
        log.warning("allowed despite: %s (visitor %s)", ", ".join(flags), ident.visitor_id)

    return {"ok": True, "visitor_id": ident.visitor_id, "flags": flags}


# FastAPI usage:
#   @app.post("/api/login")
#   async def login(req: LoginRequest):
#       check = verify_event(req.event_id)
#       if not check["ok"]:
#           log.warning("blocked: %s", check["reason"])
#           raise HTTPException(status_code=403, detail={"error": "blocked", "reason": check["reason"]})
#       # ...proceed; bind check["visitor_id"] to the account...
#
# Flask usage:
#   @app.post("/api/login")
#   def login():
#       check = verify_event(request.json.get("event_id"))
#       if not check["ok"]:
#           log.warning("blocked: %s", check["reason"])
#           return {"error": "blocked", "reason": check["reason"]}, 403
#       # ...proceed; bind check["visitor_id"] to the account...
