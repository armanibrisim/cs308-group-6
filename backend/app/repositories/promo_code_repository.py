"""Firestore repository for promo codes.

Collection: ``promo_codes``

Each document stores:
    id               str       — Firestore auto-generated document ID
    code             str       — Uppercase promo code string (unique, encrypted)
    code_hash        str       — HMAC-SHA256 of code (plaintext, for Firestore queries)
    discount_percent float     — 1–100 (encrypted)
    max_uses         int|null  — None means unlimited (encrypted)
    uses             int       — Current redemption count (encrypted)
    expires_at       str|null  — ISO-8601 datetime or None (encrypted)
    is_active        bool      (encrypted)
    created_at       str       — ISO-8601 datetime (encrypted)
"""

from datetime import datetime, timezone
from typing import Optional

import firebase_admin.firestore as firestore_module
from fastapi import HTTPException, status

from app.firebase.client import get_firebase_app
from app.utils.encryption import decrypt_json, encrypt_json, make_hash

PROMO_CODES_COLLECTION = "promo_codes"

_PROMO_ENC = {"code", "discount_percent", "max_uses", "uses", "expires_at", "is_active", "created_at"}


def _db():
    get_firebase_app()
    return firestore_module.client()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _encrypt_promo(doc: dict) -> dict:
    result = dict(doc)
    for field in _PROMO_ENC:
        if field in result:
            result[field] = encrypt_json(result[field])
    return result


def _decrypt_promo(doc: dict) -> dict:
    result = dict(doc)
    for field in _PROMO_ENC:
        if field in result:
            result[field] = decrypt_json(result[field])
    return result


def _enc_promo_update(updates: dict) -> dict:
    """Encrypt only encryptable fields in a partial update dict."""
    result = {}
    for k, v in updates.items():
        if k in _PROMO_ENC:
            result[k] = encrypt_json(v)
        elif k == "code_hash":
            result[k] = v
        else:
            result[k] = v
    return result


def _get_by_code_raw(code: str) -> Optional[dict]:
    """Return the decrypted Firestore dict for *code* (case-insensitive lookup)."""
    db = _db()
    docs = (
        db.collection(PROMO_CODES_COLLECTION)
        .where("code_hash", "==", make_hash(code.upper()))
        .limit(1)
        .stream()
    )
    for doc in docs:
        data = _decrypt_promo(doc.to_dict())
        data["id"] = doc.id
        return data
    return None


# ── CRUD ───────────────────────────────────────────────────────────────────────

def create_promo_code(data: dict) -> str:
    """Persist a new promo code.  Raises 409 if the code already exists."""
    code_upper = data["code"].upper()

    existing = _get_by_code_raw(code_upper)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Promo code '{code_upper}' already exists.",
        )

    db = _db()
    ref = db.collection(PROMO_CODES_COLLECTION).document()
    payload = {
        **data,
        "id": ref.id,
        "code": code_upper,
        "code_hash": make_hash(code_upper),
        "uses": 0,
        "created_at": _now_iso(),
    }
    ref.set(_encrypt_promo(payload))
    return ref.id


def get_promo_code_by_id(code_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(PROMO_CODES_COLLECTION).document(code_id).get()
    if not doc.exists:
        return None
    data = _decrypt_promo(doc.to_dict())
    data["id"] = doc.id
    return data


def get_promo_code_by_code(code: str) -> Optional[dict]:
    """Public lookup — returns None if not found (does NOT raise)."""
    return _get_by_code_raw(code)


def list_promo_codes() -> list[dict]:
    db = _db()
    docs = list(db.collection(PROMO_CODES_COLLECTION).stream())
    results = []
    for doc in docs:
        data = _decrypt_promo(doc.to_dict())
        data["id"] = doc.id
        results.append(data)
    results.sort(key=lambda p: p.get("created_at", ""), reverse=True)
    return results


def update_promo_code(code_id: str, updates: dict) -> dict:
    """Partially update a promo code.  Returns the updated document."""
    db = _db()
    ref = db.collection(PROMO_CODES_COLLECTION).document(code_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promo code '{code_id}' not found.",
        )
    if "code" in updates:
        code_upper = updates["code"].upper()
        updates["code"] = code_upper
        updates["code_hash"] = make_hash(code_upper)

    ref.update(_enc_promo_update(updates))
    updated = _decrypt_promo(ref.get().to_dict())
    updated["id"] = code_id
    return updated


def deactivate_promo_code(code_id: str) -> dict:
    return update_promo_code(code_id, {"is_active": False})


def delete_promo_code(code_id: str) -> None:
    db = _db()
    ref = db.collection(PROMO_CODES_COLLECTION).document(code_id)
    if not ref.get().exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promo code '{code_id}' not found.",
        )
    ref.delete()


# ── Validation (used at checkout) ──────────────────────────────────────────────

def validate_promo_code(code: str) -> dict:
    """Validate a promo code and return the full document (decrypted).

    Raises HTTPException (400) if the code is invalid, inactive, expired, or
    exhausted.  Does NOT increment uses — call ``increment_uses`` after a
    successful order is created.
    """
    promo = _get_by_code_raw(code)

    if not promo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Promo code '{code.upper()}' is not valid.",
        )

    if not promo.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Promo code '{code.upper()}' is no longer active.",
        )

    expires_at = promo.get("expires_at")
    if expires_at:
        if _now_iso() > expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Promo code '{code.upper()}' has expired.",
            )

    max_uses = promo.get("max_uses")
    if max_uses is not None and promo.get("uses", 0) >= max_uses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Promo code '{code.upper()}' has reached its usage limit.",
        )

    return promo


def increment_uses(code_id: str) -> None:
    """Increment the uses counter via a read-decrypt-increment-encrypt-write transaction."""
    db = _db()
    ref = db.collection(PROMO_CODES_COLLECTION).document(code_id)

    @firestore_module.transactional
    def _txn(transaction):
        doc = ref.get(transaction=transaction)
        if not doc.exists:
            return
        data = _decrypt_promo(doc.to_dict())
        new_uses = (data.get("uses") or 0) + 1
        transaction.update(ref, {"uses": encrypt_json(new_uses)})

    _txn(db.transaction())
