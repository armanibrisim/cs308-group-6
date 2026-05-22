from datetime import datetime, timezone

import firebase_admin.firestore as firestore_module
from google.cloud.firestore_v1 import FieldFilter

from app.firebase.client import get_firebase_app
from app.utils.encryption import decrypt_json, encrypt_json, make_hash

NOTIFICATIONS_COLLECTION = "notifications"

_NOTIF_ENC = {"user_id", "message", "product_id", "product_name", "read", "created_at"}


def _db():
    get_firebase_app()
    return firestore_module.client()


def _encrypt_notification(doc: dict) -> dict:
    result = dict(doc)
    for field in _NOTIF_ENC:
        if field in result:
            result[field] = encrypt_json(result[field])
    return result


def _decrypt_notification(doc: dict) -> dict:
    result = dict(doc)
    for field in _NOTIF_ENC:
        if field in result:
            result[field] = decrypt_json(result[field])
    return result


def create_notification(user_id: str, message: str, product_id: str, product_name: str) -> str:
    db = _db()
    ref = db.collection(NOTIFICATIONS_COLLECTION).document()
    data = {
        "id": ref.id,
        "user_id": user_id,
        "user_id_hash": make_hash(user_id),
        "message": message,
        "product_id": product_id,
        "product_name": product_name,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    ref.set(_encrypt_notification(data))
    return ref.id


def get_notifications_for_user(user_id: str) -> list[dict]:
    db = _db()
    docs = (
        db.collection(NOTIFICATIONS_COLLECTION)
        .where(filter=FieldFilter("user_id_hash", "==", make_hash(user_id)))
        .limit(50)
        .stream()
    )
    results = [_decrypt_notification(d.to_dict()) for d in docs]
    results.sort(key=lambda n: n.get("created_at", ""), reverse=True)
    return results


def mark_notification_read(user_id: str, notification_id: str) -> bool:
    db = _db()
    doc = db.collection(NOTIFICATIONS_COLLECTION).document(notification_id).get()
    if not doc.exists:
        return False
    data = _decrypt_notification(doc.to_dict())
    if data.get("user_id") != user_id:
        return False
    doc.reference.update({"read": encrypt_json(True)})
    return True


def mark_all_read(user_id: str) -> None:
    db = _db()
    docs = (
        db.collection(NOTIFICATIONS_COLLECTION)
        .where(filter=FieldFilter("user_id_hash", "==", make_hash(user_id)))
        .stream()
    )
    for doc in docs:
        data = _decrypt_notification(doc.to_dict())
        if not data.get("read", False):
            doc.reference.update({"read": encrypt_json(True)})
