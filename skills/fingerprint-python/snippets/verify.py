# Server-side lookup of an event_id sent by the frontend. Returns what the Server API reports and
# rejects nothing — which signals should stop an action is up to the use-case skills.
from .client import client


def verify_event(event_id):
    if not event_id:
        return {"error": "missing_event_id"}

    try:
        event = client.get_event(event_id)
    except Exception:
        return {"error": "lookup_failed"}  # usually a wrong secret key or region

    ident = event.identification
    return {
        "visitor_id": ident.visitor_id if ident else None,
        "confidence": ident.confidence.score if ident and ident.confidence else None,
        "replayed": event.replayed,
        "bot": event.bot,
        "bot_info": event.bot_info.to_dict() if event.bot_info else None,
        "vpn": event.vpn,
        "proxy": event.proxy,
        "tampering": event.tampering,
        "incognito": event.incognito,
        "suspect_score": event.suspect_score,
    }


# FastAPI usage — run the action as before and hand the signals to the frontend:
#   @app.post("/api/login")
#   async def login(req: LoginRequest):
#       fingerprint = verify_event(req.event_id)
#       print("[fingerprint]", fingerprint)
#       # ...run login as before...
#       return {**result, "fingerprint": fingerprint}
#
# Flask usage:
#   @app.post("/api/login")
#   def login():
#       fingerprint = verify_event(request.json.get("event_id"))
#       print("[fingerprint]", fingerprint)
#       # ...run login as before...
#       return {**result, "fingerprint": fingerprint}
