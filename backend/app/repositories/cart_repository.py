from datetime import datetime, timezone
from typing import Optional

from app.firebase.client import get_firebase_app
import firebase_admin.firestore as firestore_module

CARTS_COLLECTION = "carts"


def _db():
    get_firebase_app()
    return firestore_module.client()


def _cart_ref(user_id: str):
    return _db().collection(CARTS_COLLECTION).document(user_id)


def get_cart(user_id: str) -> dict:
    """Return the cart document for a user. Creates an empty one if absent."""
    ref = _cart_ref(user_id)
    doc = ref.get()
    if not doc.exists:
        return {"user_id": user_id, "items": []}
    data = doc.to_dict()
    data.setdefault("items", [])
    return data


def add_or_update_item(user_id: str, product_id: str, quantity: int) -> None:
    """Add a product to the cart or update its quantity if already present."""
    ref = _cart_ref(user_id)
    db = _db()

    @firestore_module.transactional
    def _txn(transaction):
        snapshot = ref.get(transaction=transaction)
        if snapshot.exists:
            items: list = snapshot.get("items") or []
        else:
            items = []

        # Check if item already in cart
        for item in items:
            if item["product_id"] == product_id:
                item["quantity"] = quantity
                break
        else:
            items.append({
                "product_id": product_id,
                "quantity": quantity,
                "added_at": datetime.now(timezone.utc).isoformat(),
            })

        transaction.set(ref, {
            "user_id": user_id,
            "items": items,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    _txn(db.transaction())


def remove_item(user_id: str, product_id: str) -> None:
    """Remove a single product from the cart."""
    ref = _cart_ref(user_id)
    db = _db()

    @firestore_module.transactional
    def _txn(transaction):
        snapshot = ref.get(transaction=transaction)
        if not snapshot.exists:
            return
        items = [i for i in (snapshot.get("items") or []) if i["product_id"] != product_id]
        transaction.set(ref, {
            "user_id": user_id,
            "items": items,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    _txn(db.transaction())


def clear_cart(user_id: str) -> None:
    """Remove all items from the cart."""
    _cart_ref(user_id).set({
        "user_id": user_id,
        "items": [],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
