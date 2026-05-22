from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _enc_key() -> bytes:
    return bytes.fromhex(os.getenv("ENCRYPTION_KEY", "0" * 64))


def _hmac_key() -> bytes:
    return os.getenv("HMAC_KEY", "default-hmac-key-change-me").encode()


def encrypt_json(value) -> str | None:
    """Encrypt any JSON-serialisable value. Returns None if value is None."""
    if value is None:
        return None
    raw = json.dumps(value, ensure_ascii=False)
    nonce = os.urandom(12)
    ct = AESGCM(_enc_key()).encrypt(nonce, raw.encode(), None)
    return base64.b64encode(nonce + ct).decode()


def decrypt_json(token) -> object:
    """Decrypt a token produced by encrypt_json. Returns the original Python value.

    Falls back gracefully for legacy plaintext / native Firestore types so the
    migration script can re-encrypt without crashing.
    """
    if token is None:
        return None
    if not isinstance(token, str):
        # Legacy native Firestore type (bool, int, float, list, dict) — pass through.
        return token
    try:
        data = base64.b64decode(token.encode())
        plaintext = AESGCM(_enc_key()).decrypt(data[:12], data[12:], None).decode()
        return json.loads(plaintext)
    except Exception:
        # Fallback: return as-is (plain-text legacy value or non-JSON string).
        try:
            return json.loads(token)
        except Exception:
            return token


def make_hash(value: str) -> str:
    """Return HMAC-SHA256 hex digest of value. Used as a non-reversible query key."""
    return hmac.new(_hmac_key(), str(value).encode(), hashlib.sha256).hexdigest()
