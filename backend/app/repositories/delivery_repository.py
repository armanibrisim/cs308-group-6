from datetime import datetime, timezone
from typing import Optional

import firebase_admin.firestore as firestore_module

from app.firebase.client import get_firebase_app
from app.utils.encryption import decrypt_json, encrypt_json

DELIVERIES_COLLECTION = "deliveries"

_DELIVERY_ENC = {
    "customer_id", "product_id", "product_name", "quantity",
    "total_price", "delivery_address", "is_completed", "order_id", "created_at",
}


def _db():
    get_firebase_app()
    return firestore_module.client()


def _encrypt_delivery(doc: dict) -> dict:
    result = dict(doc)
    for field in _DELIVERY_ENC:
        if field in result:
            result[field] = encrypt_json(result[field])
    return result


def _decrypt_delivery(doc: dict) -> dict:
    result = dict(doc)
    for field in _DELIVERY_ENC:
        if field in result:
            result[field] = decrypt_json(result[field])
    return result


def create_delivery(data: dict) -> str:
    db = _db()
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["is_completed"] = False
    ref = db.collection(DELIVERIES_COLLECTION).document()
    data["id"] = ref.id
    ref.set(_encrypt_delivery(data))
    return ref.id


def list_deliveries(is_completed: Optional[bool] = None) -> list[dict]:
    db = _db()
    docs = list(db.collection(DELIVERIES_COLLECTION).stream())
    results = [_decrypt_delivery(d.to_dict()) for d in docs]
    if is_completed is not None:
        results = [d for d in results if d.get("is_completed") == is_completed]
    results.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    return results


def get_delivery_by_id(delivery_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(DELIVERIES_COLLECTION).document(delivery_id).get()
    if not doc.exists:
        return None
    return _decrypt_delivery(doc.to_dict())


def mark_delivery_complete(delivery_id: str) -> None:
    db = _db()
    db.collection(DELIVERIES_COLLECTION).document(delivery_id).update({
        "is_completed": encrypt_json(True),
    })
