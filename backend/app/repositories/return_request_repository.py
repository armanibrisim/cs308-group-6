from datetime import datetime, timezone
from typing import Optional

import firebase_admin.firestore as firestore_module
from google.cloud.firestore_v1 import FieldFilter

from app.firebase.client import get_firebase_app
from app.utils.encryption import decrypt_json, encrypt_json, make_hash

RETURNS_COLLECTION = "return_requests"

_RETURN_ENC = {
    "customer_id", "customer_email", "customer_name",
    "order_id", "product_id", "product_name",
    "quantity", "total_price", "reason", "status", "created_at",
}


def _db():
    get_firebase_app()
    return firestore_module.client()


def _encrypt_return(doc: dict) -> dict:
    result = dict(doc)
    for field in _RETURN_ENC:
        if field in result:
            result[field] = encrypt_json(result[field])
    return result


def _decrypt_return(doc: dict) -> dict:
    result = dict(doc)
    for field in _RETURN_ENC:
        if field in result:
            result[field] = decrypt_json(result[field])
    return result


def create_return(data: dict) -> str:
    db = _db()
    now = datetime.now(timezone.utc).isoformat()
    data.setdefault("status", "pending")
    data["created_at"] = now
    # HMAC hashes for queryable fields
    if "customer_id" in data:
        data["customer_id_hash"] = make_hash(data["customer_id"])
    if "order_id" in data:
        data["order_id_hash"] = make_hash(data["order_id"])
    ref = db.collection(RETURNS_COLLECTION).document()
    data["id"] = ref.id
    ref.set(_encrypt_return(data))
    return ref.id


def get_return_by_id(return_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(RETURNS_COLLECTION).document(return_id).get()
    if not doc.exists:
        return None
    return _decrypt_return(doc.to_dict())


def list_returns_for_customer(customer_id: str) -> list[dict]:
    db = _db()
    docs = (
        db.collection(RETURNS_COLLECTION)
        .where(filter=FieldFilter("customer_id_hash", "==", make_hash(customer_id)))
        .stream()
    )
    results = [_decrypt_return(d.to_dict()) for d in docs]
    results.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return results


def list_all_returns() -> list[dict]:
    db = _db()
    docs = db.collection(RETURNS_COLLECTION).stream()
    results = [_decrypt_return(d.to_dict()) for d in docs]
    results.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return results


def any_return_for_line(order_id: str, product_id: str) -> Optional[dict]:
    """Return an existing return request for this order line, if any."""
    db = _db()
    docs = (
        db.collection(RETURNS_COLLECTION)
        .where(filter=FieldFilter("order_id_hash", "==", make_hash(order_id)))
        .stream()
    )
    for d in docs:
        data = _decrypt_return(d.to_dict())
        if data.get("product_id") == product_id:
            return data
    return None


def update_return_status(return_id: str, new_status: str) -> None:
    db = _db()
    db.collection(RETURNS_COLLECTION).document(return_id).update({
        "status": encrypt_json(new_status),
    })
