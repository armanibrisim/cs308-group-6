from typing import Optional

import firebase_admin.firestore as firestore_module
from google.cloud.firestore_v1 import FieldFilter

from app.firebase.client import get_firebase_app

WISHLISTS_COLLECTION = "wishlists"


def _db():
    get_firebase_app()
    return firestore_module.client()


def get_wishlists_for_product(product_id: str) -> list[dict]:
    """Return all wishlist docs that contain the given product_id."""
    db = _db()
    docs = (
        db.collection(WISHLISTS_COLLECTION)
        .where(filter=FieldFilter("product_ids", "array_contains", product_id))
        .stream()
    )
    return [d.to_dict() for d in docs]


def get_wishlist_by_user(user_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(WISHLISTS_COLLECTION).document(user_id).get()
    if not doc.exists:
        return None
    return doc.to_dict()


def add_to_wishlist(user_id: str, product_id: str) -> None:
    db = _db()
    ref = db.collection(WISHLISTS_COLLECTION).document(user_id)
    doc = ref.get()
    if doc.exists:
        data = doc.to_dict()
        product_ids = data.get("product_ids", [])
        if product_id not in product_ids:
            product_ids.append(product_id)
            ref.update({"product_ids": product_ids})
    else:
        ref.set({"user_id": user_id, "product_ids": [product_id]})


def remove_from_wishlist(user_id: str, product_id: str) -> None:
    db = _db()
    ref = db.collection(WISHLISTS_COLLECTION).document(user_id)
    doc = ref.get()
    if doc.exists:
        data = doc.to_dict()
        product_ids = [p for p in data.get("product_ids", []) if p != product_id]
        ref.update({"product_ids": product_ids})
