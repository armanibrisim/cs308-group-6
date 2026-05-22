from typing import Optional

import firebase_admin.firestore as firestore_module

from app.firebase.client import get_firebase_app
from app.utils.encryption import decrypt_json, encrypt_json

WISHLISTS_COLLECTION = "wishlists"


def _db():
    get_firebase_app()
    return firestore_module.client()


def _encrypt_wishlist(doc: dict) -> dict:
    result = dict(doc)
    if "product_ids" in result:
        result["product_ids"] = encrypt_json(result["product_ids"])
    return result


def _decrypt_wishlist(doc: dict) -> dict:
    result = dict(doc)
    if "product_ids" in result:
        result["product_ids"] = decrypt_json(result["product_ids"]) or []
    return result


def get_wishlists_for_product(product_id: str) -> list[dict]:
    """Return all wishlist docs that contain the given product_id.
    Fetches all wishlists and filters in Python after decryption (product_ids is encrypted).
    """
    db = _db()
    docs = db.collection(WISHLISTS_COLLECTION).stream()
    result = []
    for d in docs:
        data = _decrypt_wishlist(d.to_dict())
        if product_id in (data.get("product_ids") or []):
            result.append(data)
    return result


def get_wishlist_by_user(user_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(WISHLISTS_COLLECTION).document(user_id).get()
    if not doc.exists:
        return None
    return _decrypt_wishlist(doc.to_dict())


def add_to_wishlist(user_id: str, product_id: str) -> None:
    db = _db()
    ref = db.collection(WISHLISTS_COLLECTION).document(user_id)
    doc = ref.get()
    if doc.exists:
        data = _decrypt_wishlist(doc.to_dict())
        product_ids = data.get("product_ids") or []
        if product_id not in product_ids:
            product_ids.append(product_id)
            ref.update({"product_ids": encrypt_json(product_ids)})
    else:
        ref.set(_encrypt_wishlist({"user_id": user_id, "product_ids": [product_id]}))


def remove_from_wishlist(user_id: str, product_id: str) -> None:
    db = _db()
    ref = db.collection(WISHLISTS_COLLECTION).document(user_id)
    doc = ref.get()
    if doc.exists:
        data = _decrypt_wishlist(doc.to_dict())
        product_ids = [p for p in (data.get("product_ids") or []) if p != product_id]
        ref.update({"product_ids": encrypt_json(product_ids)})
