from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any

from cryptography.fernet import Fernet, InvalidToken

from .config import settings


class SecurityConfigurationError(RuntimeError):
    pass


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def hash_password(password: str) -> str:
    if len(password) < 10:
        raise ValueError("Password must be at least 10 characters.")
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return f"scrypt${_b64url(salt)}${_b64url(derived)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, salt_raw, digest_raw = stored.split("$", 2)
        if algorithm != "scrypt":
            return False
        salt = _b64url_decode(salt_raw)
        expected = _b64url_decode(digest_raw)
        actual = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=len(expected))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def issue_token(user_id: int, email: str, role: str) -> str:
    if len(settings.jwt_secret) < 32:
        raise SecurityConfigurationError("CLAIMBOT_JWT_SECRET must be at least 32 characters before backend authentication can be used.")
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": str(user_id), "email": email, "role": role, "iat": now, "exp": now + settings.token_minutes * 60}
    segments = [_b64url(json.dumps(header, separators=(",", ":")).encode()), _b64url(json.dumps(payload, separators=(",", ":")).encode())]
    signing_input = ".".join(segments).encode("ascii")
    signature = hmac.new(settings.jwt_secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{segments[0]}.{segments[1]}.{_b64url(signature)}"


def decode_token(token: str) -> dict[str, Any]:
    if len(settings.jwt_secret) < 32:
        raise SecurityConfigurationError("Backend authentication secret is not configured.")
    try:
        header_raw, payload_raw, signature_raw = token.split(".")
        signing_input = f"{header_raw}.{payload_raw}".encode("ascii")
        expected = hmac.new(settings.jwt_secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
        supplied = _b64url_decode(signature_raw)
        if not hmac.compare_digest(expected, supplied):
            raise ValueError("invalid signature")
        payload = json.loads(_b64url_decode(payload_raw))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("expired")
        return payload
    except Exception as exc:
        raise ValueError("Invalid or expired authentication token.") from exc


def _fernet() -> Fernet:
    if not settings.data_key:
        raise SecurityConfigurationError("CLAIMBOT_DATA_KEY is required for PHI-capable storage.")
    try:
        return Fernet(settings.data_key.encode("ascii"))
    except Exception as exc:
        raise SecurityConfigurationError("CLAIMBOT_DATA_KEY must be a valid Fernet key.") from exc


def encrypt_text(value: str | None) -> str | None:
    if value is None or value == "":
        return value
    return _fernet().encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_text(value: str | None) -> str | None:
    if value is None or value == "":
        return value
    try:
        return _fernet().decrypt(value.encode("ascii")).decode("utf-8")
    except InvalidToken:
        return "[encrypted value unavailable]"


def data_protection_status() -> dict[str, bool]:
    return {
        "allow_phi": settings.allow_phi,
        "encryption_key_configured": bool(settings.data_key),
        "authentication_secret_configured": len(settings.jwt_secret) >= 32,
        "bootstrap_token_configured": bool(settings.bootstrap_token),
    }


def generate_data_key() -> str:
    return Fernet.generate_key().decode("ascii")
