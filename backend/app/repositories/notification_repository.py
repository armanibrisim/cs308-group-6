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
    db = _db()
    docs = (
        db.collection(NOTIFICATIONS_COLLECTION)
        .where("user_id", "==", user_id)
        .order_by("created_at", direction="DESCENDING")
        .limit(50)
        .stream()
    )
    return [d.to_dict() for d in docs]
