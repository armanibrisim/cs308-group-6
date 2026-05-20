from datetime import datetime, timezone
from typing import Optional

import firebase_admin.firestore as firestore_module
from google.cloud.firestore_v1 import FieldFilter

from app.firebase.client import get_firebase_app

RETURNS_COLLECTION = "return_requests"


def _db():
    get_firebase_app()
    return firestore_module.client()


def create_return(data: dict) -> str:
    db = _db()
    now = datetime.now(timezone.utc).isoformat()
    data.setdefault("status", "pending")
    data["created_at"] = now
    ref = db.collection(RETURNS_COLLECTION).document()
    data["id"] = ref.id
    ref.set(data)
    return ref.id


def get_return_by_id(return_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(RETURNS_COLLECTION).document(return_id).get()
    if not doc.exists:
        return None
    return doc.to_dict()


def list_returns_for_customer(customer_id: str) -> list[dict]:
    db = _db()
    docs = (
        db.collection(RETURNS_COLLECTION)
        .where(filter=FieldFilter("customer_id", "==", customer_id))
        .stream()
    )
    results = [d.to_dict() for d in docs]
    results.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return results


def list_all_returns() -> list[dict]:
    db = _db()
    docs = db.collection(RETURNS_COLLECTION).stream()
    results = [d.to_dict() for d in docs]
    results.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return results


def any_return_for_line(order_id: str, product_id: str) -> Optional[dict]:
    """Return an existing return request for this order line, if any."""
    db = _db()
    docs = (
        db.collection(RETURNS_COLLECTION)
        .where(filter=FieldFilter("order_id", "==", order_id))
        .stream()
    )
    for d in docs:
        data = d.to_dict()
        if data.get("product_id") == product_id:
            return data
    return None


def update_return_status(return_id: str, new_status: str) -> None:
    db = _db()
    db.collection(RETURNS_COLLECTION).document(return_id).update({"status": new_status})
