from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone
from typing import Optional

from firebase_admin import firestore

from app.firebase.client import get_firebase_app
from app.utils.security import hash_password
from app.utils.encryption import decrypt_json, encrypt_json


def _db():
    get_firebase_app()
    return firestore.client()


# Fields encrypted at rest. "password" is bcrypt-hashed and left as-is.
_USER_ENC = {"first_name", "last_name", "email", "role", "tax_id", "created_at",
             "addresses", "saved_cards"}


def _encrypt_user(doc: dict) -> dict:
    result = dict(doc)
    for field in _USER_ENC:
        if field in result:
            result[field] = encrypt_json(result[field])
    return result


def _decrypt_user(doc: dict) -> dict:
    result = dict(doc)
    for field in _USER_ENC:
        if field in result:
            result[field] = decrypt_json(result[field])
    return result


def get_user_by_email(email: str) -> tuple[str, dict] | None:
    # Email is the document ID — use direct lookup instead of a query.
    user = get_user_by_id(email)
    if user is None:
        return None
    return email, user


def get_user_by_id(user_id: str) -> dict | None:
    db = _db()
    doc = db.collection("users").document(user_id).get()
    if not doc.exists:
        return None
    return _decrypt_user(doc.to_dict())


def _generate_tax_id() -> str:
    return "TAX-" + "".join([str(random.randint(0, 9)) for _ in range(10)])


def create_user(email: str, password: str, first_name: str, last_name: str) -> str:
    db = _db()
    doc_id = email
    doc = {
        "email": email,
        "password": hash_password(password),
        "first_name": first_name,
        "last_name": last_name,
        "role": "customer",
        "addresses": [],
        "saved_cards": [],
        "tax_id": _generate_tax_id(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db.collection("users").document(doc_id).set(_encrypt_user(doc))
    return doc_id


# ── Address helpers ───────────────────────────────────────────────────────────

def get_addresses(user_id: str) -> list[dict]:
    user = get_user_by_id(user_id)
    if not user:
        return []
    return user.get("addresses") or []


def add_address(user_id: str, label: str, full_address: str, is_default: bool) -> dict:
    db = _db()
    ref = db.collection("users").document(user_id)

    existing = get_addresses(user_id)

    if is_default or len(existing) == 0:
        is_default = True
        for addr in existing:
            addr["is_default"] = False

    new_addr = {
        "id": str(uuid.uuid4()),
        "label": label,
        "full_address": full_address,
        "is_default": is_default,
    }
    existing.append(new_addr)
    ref.update({"addresses": encrypt_json(existing)})
    return new_addr


def delete_address(user_id: str, address_id: str) -> bool:
    db = _db()
    ref = db.collection("users").document(user_id)
    existing = get_addresses(user_id)

    new_list = [a for a in existing if a["id"] != address_id]
    if len(new_list) == len(existing):
        return False

    was_default = any(a["id"] == address_id and a.get("is_default") for a in existing)
    if was_default and new_list:
        new_list[0]["is_default"] = True

    ref.update({"addresses": encrypt_json(new_list)})
    return True


def set_default_address(user_id: str, address_id: str) -> bool:
    db = _db()
    ref = db.collection("users").document(user_id)
    existing = get_addresses(user_id)

    found = False
    for addr in existing:
        addr["is_default"] = addr["id"] == address_id
        if addr["is_default"]:
            found = True

    if not found:
        return False
    ref.update({"addresses": encrypt_json(existing)})
    return True


# ── Saved card helpers ────────────────────────────────────────────────────────

def get_saved_cards(user_id: str) -> list[dict]:
    user = get_user_by_id(user_id)
    if not user:
        return []
    return user.get("saved_cards") or []


def add_saved_card(
    user_id: str, label: str, last4: str, card_holder_name: str, expiry: str, is_default: bool
) -> dict:
    db = _db()
    ref = db.collection("users").document(user_id)
    existing = get_saved_cards(user_id)

    if is_default or len(existing) == 0:
        is_default = True
        for card in existing:
            card["is_default"] = False

    new_card = {
        "id": str(uuid.uuid4()),
        "label": label,
        "last4": last4,
        "card_holder_name": card_holder_name,
        "expiry": expiry,
        "is_default": is_default,
    }
    existing.append(new_card)
    ref.update({"saved_cards": encrypt_json(existing)})
    return new_card


def delete_saved_card(user_id: str, card_id: str) -> bool:
    db = _db()
    ref = db.collection("users").document(user_id)
    existing = get_saved_cards(user_id)

    new_list = [c for c in existing if c["id"] != card_id]
    if len(new_list) == len(existing):
        return False

    was_default = any(c["id"] == card_id and c.get("is_default") for c in existing)
    if was_default and new_list:
        new_list[0]["is_default"] = True

    ref.update({"saved_cards": encrypt_json(new_list)})
    return True


# ── Admin helpers ─────────────────────────────────────────────────────────────

def get_all_users() -> list[dict]:
    db = _db()
    docs = db.collection("users").stream()
    result = []
    for doc in docs:
        data = _decrypt_user(doc.to_dict())
        result.append({
            "id": doc.id,
            "email": data.get("email", ""),
            "first_name": data.get("first_name", ""),
            "last_name": data.get("last_name", ""),
            "role": data.get("role", "customer"),
            "created_at": data.get("created_at", ""),
        })
    return result


def update_user_role(user_id: str, new_role: str) -> bool:
    db = _db()
    ref = db.collection("users").document(user_id)
    doc = ref.get()
    if not doc.exists:
        return False
    ref.update({"role": encrypt_json(new_role)})
    return True


def set_default_card(user_id: str, card_id: str) -> bool:
    db = _db()
    ref = db.collection("users").document(user_id)
    existing = get_saved_cards(user_id)

    found = False
    for card in existing:
        card["is_default"] = card["id"] == card_id
        if card["is_default"]:
            found = True

    if not found:
        return False
    ref.update({"saved_cards": encrypt_json(existing)})
    return True
