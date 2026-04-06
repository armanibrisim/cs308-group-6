from datetime import datetime, timezone
from typing import Optional

import firebase_admin.firestore as firestore_module
from google.cloud.firestore_v1 import FieldFilter

from app.firebase.client import get_firebase_app

ORDERS_COLLECTION = "orders"


def _db():
    get_firebase_app()
    return firestore_module.client()


def create_order(data: dict) -> str:
    db = _db()
    now = datetime.now(timezone.utc).isoformat()
    data["created_at"] = now
    data["updated_at"] = now
    data["status"] = "processing"
    ref = db.collection(ORDERS_COLLECTION).document()
    data["id"] = ref.id
    ref.set(data)
    return ref.id


def get_order_by_id(order_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(ORDERS_COLLECTION).document(order_id).get()
    if not doc.exists:
        return None
    return doc.to_dict()


def list_orders_by_customer(customer_id: str) -> list[dict]:
    db = _db()
    docs = (
        db.collection(ORDERS_COLLECTION)
        .where(filter=FieldFilter("customer_id", "==", customer_id))
        .stream()
    )
    results = [d.to_dict() for d in docs]
    results.sort(key=lambda o: o.get("created_at", ""), reverse=True)
    return results


def list_all_orders(status: Optional[str] = None) -> list[dict]:
    db = _db()
    query = db.collection(ORDERS_COLLECTION)
    if status:
        query = query.where(filter=FieldFilter("status", "==", status))
    docs = list(query.stream())
    results = [d.to_dict() for d in docs]
    results.sort(key=lambda o: o.get("created_at", ""), reverse=True)
    return results


def update_order_status(order_id: str, new_status: str) -> None:
    db = _db()
    db.collection(ORDERS_COLLECTION).document(order_id).update({
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })


def set_invoice_id(order_id: str, invoice_id: str) -> None:
    db = _db()
    db.collection(ORDERS_COLLECTION).document(order_id).update({
        "invoice_id": invoice_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
