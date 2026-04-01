from datetime import datetime, timezone
from typing import Optional

import firebase_admin.firestore as firestore_module
from google.cloud.firestore_v1 import FieldFilter

from app.firebase.client import get_firebase_app

DELIVERIES_COLLECTION = "deliveries"


def _db():
    get_firebase_app()
    return firestore_module.client()


def create_delivery(data: dict) -> str:
    db = _db()
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["is_completed"] = False
    ref = db.collection(DELIVERIES_COLLECTION).document()
    data["id"] = ref.id
    ref.set(data)
    return ref.id


def list_deliveries(is_completed: Optional[bool] = None) -> list[dict]:
    db = _db()
    query = db.collection(DELIVERIES_COLLECTION)
    if is_completed is not None:
        query = query.where(filter=FieldFilter("is_completed", "==", is_completed))
    docs = list(query.stream())
    results = [d.to_dict() for d in docs]
    results.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    return results


def get_delivery_by_id(delivery_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(DELIVERIES_COLLECTION).document(delivery_id).get()
    if not doc.exists:
        return None
    return doc.to_dict()


def mark_delivery_complete(delivery_id: str) -> None:
    db = _db()
    db.collection(DELIVERIES_COLLECTION).document(delivery_id).update({
        "is_completed": True,
    })
