from __future__ import annotations

from firebase_admin import firestore
from app.firebase.client import get_firebase_app


def get_user_by_email(email: str) -> tuple[str, dict] | None:
    get_firebase_app()
    db = firestore.client()

    for doc in db.collection("users").stream():
        data = doc.to_dict()
        if data.get("email") == email:
            return doc.id, data

    return None


def create_user(email: str, password: str, first_name: str, last_name: str) -> str:
    get_firebase_app()
    db = firestore.client()

    users_ref = db.collection("users")
    count = len(list(users_ref.stream()))
    doc_id = f"user_{count}"

    users_ref.document(doc_id).set({
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name,
        "role": "customer",
    })

    return doc_id
