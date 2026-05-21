from __future__ import annotations

import logging
import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push(token: str, title: str, body: str, data: dict | None = None) -> None:
    if not token or not token.startswith("ExponentPushToken"):
        return

    message = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "priority": "high",
        "data": data or {},
    }

    try:
        response = httpx.post(
            EXPO_PUSH_URL,
            json=message,
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        result = response.json()
        if result.get("data", {}).get("status") == "error":
            logger.warning("Expo push error: %s", result)
    except Exception as exc:
        logger.error("Push gönderilemedi: %s", exc)
