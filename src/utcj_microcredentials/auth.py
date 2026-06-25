from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any

JWT_SECRET = "utcj_super_secret_session_key_2026_hardened"


def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def base64url_decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)


def create_jwt(payload: dict[str, Any], expires_in: int = 3600) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_json = json.dumps(header, separators=(",", ":")).encode("utf-8")

    payload_copy = dict(payload)
    payload_copy["exp"] = int(time.time()) + expires_in
    payload_json = json.dumps(payload_copy, separators=(",", ":")).encode("utf-8")

    unsigned = f"{base64url_encode(header_json)}.{base64url_encode(payload_json)}".encode("utf-8")
    signature = hmac.new(JWT_SECRET.encode("utf-8"), unsigned, hashlib.sha256).digest()

    return f"{unsigned.decode('utf-8')}.{base64url_encode(signature)}"


def verify_jwt(token: str) -> dict[str, Any] | None:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        unsigned = f"{parts[0]}.{parts[1]}".encode("utf-8")
        expected_sig = base64url_encode(hmac.new(JWT_SECRET.encode("utf-8"), unsigned, hashlib.sha256).digest())

        if not hmac.compare_digest(parts[2], expected_sig):
            return None

        payload = json.loads(base64url_decode(parts[1]).decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None  # Expired

        return payload
    except Exception:
        return None
