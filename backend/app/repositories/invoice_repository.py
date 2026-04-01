from datetime import datetime, timezone
from typing import Optional

import firebase_admin.firestore as firestore_module

from app.firebase.client import get_firebase_app

INVOICES_COLLECTION = "invoices"


def _db():
    get_firebase_app()
    return firestore_module.client()


def create_invoice(data: dict) -> str:
    db = _db()
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    ref = db.collection(INVOICES_COLLECTION).document()
    data["id"] = ref.id
    ref.set(data)
    return ref.id


def list_invoices() -> list[dict]:
    db = _db()
    docs = list(db.collection(INVOICES_COLLECTION).stream())
    results = [d.to_dict() for d in docs]
    results.sort(key=lambda inv: inv.get("created_at", ""), reverse=True)
    return results


def get_invoice_by_id(invoice_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(INVOICES_COLLECTION).document(invoice_id).get()
    if not doc.exists:
        return None
    return doc.to_dict()
