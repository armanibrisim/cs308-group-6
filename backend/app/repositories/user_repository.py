from __future__ import annotations

from datetime import datetime, timezone

from firebase_admin import firestore

from app.firebase.client import get_firebase_app
from app.utils.security import hash_password


def get_user_by_email(email: str) -> tuple[str, dict] | None:
    get_firebase_app()
    db = firestore.client()

    results = (
        db.collection("users")
        .where("email", "==", email)
        .limit(1)
        .stream()
    )
    for doc in results:
        return doc.id, doc.to_dict()

    return None


def create_user(email: str, password: str, first_name: str, last_name: str) -> str:
    get_firebase_app()
    db = firestore.client()

    doc_id = email
    db.collection("users").document(doc_id).set({
        "email": email,
        "password": hash_password(password),
        "first_name": first_name,
        "last_name": last_name,
        "role": "customer",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return doc_id
