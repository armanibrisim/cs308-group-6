from datetime import datetime, timezone

import firebase_admin.firestore as firestore_module

from app.firebase.client import get_firebase_app

NOTIFICATIONS_COLLECTION = "notifications"


def _db():
    get_firebase_app()
    return firestore_module.client()


def create_notification(user_id: str, message: str, product_id: str, product_name: str) -> str:
    db = _db()
    ref = db.collection(NOTIFICATIONS_COLLECTION).document()
    data = {
        "id": ref.id,
        "user_id": user_id,
        "message": message,
        "product_id": product_id,
        "product_name": product_name,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    ref.set(data)
    return ref.id


def get_notifications_for_user(user_id: str) -> list[dict]:
    # NOTE: Firestore requires a composite index for where("user_id") + order_by("created_at").
    # Until that index is created in Firebase Console, we sort in Python as a fallback.
    db = _db()
    docs = (
        db.collection(NOTIFICATIONS_COLLECTION)
        .where("user_id", "==", user_id)
        .limit(50)
        .stream()
    )
    results = [d.to_dict() for d in docs]
    results.sort(key=lambda n: n.get("created_at", ""), reverse=True)
    return results


def mark_notification_read(user_id: str, notification_id: str) -> bool:
    db = _db()
    doc = db.collection(NOTIFICATIONS_COLLECTION).document(notification_id).get()
    if not doc.exists or doc.to_dict().get("user_id") != user_id:
        return False
    doc.reference.update({"read": True})
    return True


def mark_all_read(user_id: str) -> None:
    db = _db()
    docs = (
        db.collection(NOTIFICATIONS_COLLECTION)
        .where("user_id", "==", user_id)
        .where("read", "==", False)
        .stream()
    )
    for doc in docs:
        doc.reference.update({"read": True})
