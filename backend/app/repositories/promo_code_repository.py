"""Firestore repository for promo codes.

Collection: ``promo_codes``

Each document stores:
    id               str       — Firestore auto-generated document ID
    code             str       — Uppercase promo code string (unique)
    discount_percent float     — 1–100
    max_uses         int|null  — None means unlimited
    uses             int       — Current redemption count
    expires_at       str|null  — ISO-8601 datetime or None
    is_active        bool
    created_at       str       — ISO-8601 datetime
"""

from datetime import datetime, timezone
from typing import Optional

import firebase_admin.firestore as firestore_module
from fastapi import HTTPException, status

from app.firebase.client import get_firebase_app

PROMO_CODES_COLLECTION = "promo_codes"


def _db():
    get_firebase_app()
    return firestore_module.client()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_by_code_raw(code: str) -> Optional[dict]:
    """Return the raw Firestore dict for *code* (case-insensitive lookup)."""
    db = _db()
    docs = (
        db.collection(PROMO_CODES_COLLECTION)
        .where("code", "==", code.upper())
        .limit(1)
        .stream()
    )
    for doc in docs:
        data = doc.to_dict()
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
        "uses": 0,
        "created_at": _now_iso(),
    }
    ref.set(payload)
    return ref.id


def get_promo_code_by_id(code_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(PROMO_CODES_COLLECTION).document(code_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
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
        data = doc.to_dict()
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
        updates["code"] = updates["code"].upper()
    ref.update(updates)
    updated = ref.get().to_dict()
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
    """Validate a promo code and return the full document.

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
    """Atomically increment the ``uses`` counter on a promo code document."""
    db = _db()
    db.collection(PROMO_CODES_COLLECTION).document(code_id).update(
        {"uses": firestore_module.Increment(1)}
    )
