from datetime import datetime, timezone
from typing import Optional

import firebase_admin.firestore as firestore_module
from google.cloud.firestore_v1 import FieldFilter

from app.firebase.client import get_firebase_app
from app.utils.encryption import decrypt_json, encrypt_json, make_hash

ORDERS_COLLECTION = "orders"

# Encrypted fields. "id" and "customer_id_hash" stay plaintext.
_ORDER_ENC = {
    "customer_id", "customer_email", "customer_name", "delivery_address",
    "items", "subtotal", "discount_amount", "promo_code", "tax", "shipping",
    "total_amount", "status", "invoice_id", "created_at", "updated_at",
    "delivered_at", "refunded_items",
}


def _db():
    get_firebase_app()
    return firestore_module.client()


def _encrypt_order(doc: dict) -> dict:
    result = dict(doc)
    for field in _ORDER_ENC:
        if field in result:
            result[field] = encrypt_json(result[field])
    return result


def _decrypt_order(doc: dict) -> dict:
    result = dict(doc)
    for field in _ORDER_ENC:
        if field in result:
            result[field] = decrypt_json(result[field])
    return result


def create_order(data: dict) -> str:
    db = _db()
    now = datetime.now(timezone.utc).isoformat()
    data["created_at"] = now
    data["updated_at"] = now
    data["status"] = "processing"
    # HMAC hash of customer_id for Firestore queries (replaces plaintext filter)
    data["customer_id_hash"] = make_hash(data["customer_id"])
    ref = db.collection(ORDERS_COLLECTION).document()
    data["id"] = ref.id
    ref.set(_encrypt_order(data))
    return ref.id


def get_order_by_id(order_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(ORDERS_COLLECTION).document(order_id).get()
    if not doc.exists:
        return None
    return _decrypt_order(doc.to_dict())


def list_orders_by_customer(customer_id: str) -> list[dict]:
    db = _db()
    docs = (
        db.collection(ORDERS_COLLECTION)
        .where(filter=FieldFilter("customer_id_hash", "==", make_hash(customer_id)))
        .stream()
    )
    results = [_decrypt_order(d.to_dict()) for d in docs]
    results.sort(key=lambda o: o.get("created_at", ""), reverse=True)
    return results


def list_all_orders(status: Optional[str] = None) -> list[dict]:
    db = _db()
    docs = list(db.collection(ORDERS_COLLECTION).stream())
    results = [_decrypt_order(d.to_dict()) for d in docs]
    if status:
        results = [o for o in results if o.get("status") == status]
    results.sort(key=lambda o: o.get("created_at", ""), reverse=True)
    return results


def update_order_status(order_id: str, new_status: str) -> None:
    db = _db()
    now = datetime.now(timezone.utc).isoformat()
    updates: dict = {
        "status": encrypt_json(new_status),
        "updated_at": encrypt_json(now),
    }
    if new_status == "delivered":
        updates["delivered_at"] = encrypt_json(now)
    db.collection(ORDERS_COLLECTION).document(order_id).update(updates)


def set_invoice_id(order_id: str, invoice_id: str) -> None:
    db = _db()
    db.collection(ORDERS_COLLECTION).document(order_id).update({
        "invoice_id": encrypt_json(invoice_id),
        "updated_at": encrypt_json(datetime.now(timezone.utc).isoformat()),
    })


def mark_item_refunded(order_id: str, product_id: str, refund_amount: float) -> None:
    """Read-decrypt-append-encrypt-write for the refunded_items list."""
    db = _db()
    now = datetime.now(timezone.utc).isoformat()
    ref = db.collection(ORDERS_COLLECTION).document(order_id)

    @firestore_module.transactional
    def _txn(transaction):
        doc = ref.get(transaction=transaction)
        if not doc.exists:
            return
        data = _decrypt_order(doc.to_dict())
        refunded_items = data.get("refunded_items") or []
        refunded_items.append({
            "product_id": product_id,
            "refund_amount": refund_amount,
            "refunded_at": now,
        })
        transaction.update(ref, {
            "refunded_items": encrypt_json(refunded_items),
            "updated_at": encrypt_json(now),
        })

    _txn(db.transaction())


def has_delivered_order_with_product(customer_id: str, product_id: str) -> bool:
    """Return True if the customer has at least one delivered order containing this product."""
    db = _db()
    docs = (
        db.collection(ORDERS_COLLECTION)
        .where(filter=FieldFilter("customer_id_hash", "==", make_hash(customer_id)))
        .stream()
    )
    for doc in docs:
        order = _decrypt_order(doc.to_dict())
        if order.get("status") != "delivered":
            continue
        for item in (order.get("items") or []):
            if item.get("product_id") == product_id:
                return True
    return False
