from datetime import datetime, timezone
from typing import Optional

import firebase_admin.firestore as firestore_module

from app.firebase.client import get_firebase_app
from app.utils.encryption import decrypt_json, encrypt_json, make_hash

INVOICES_COLLECTION = "invoices"

_INVOICE_ENC = {
    "customer_id", "customer_email", "customer_name", "customer_tax_id",
    "delivery_address", "items", "subtotal", "discount_amount", "promo_code",
    "tax", "shipping", "total_amount", "created_at",
}


def _db():
    get_firebase_app()
    return firestore_module.client()


def _encrypt_invoice(doc: dict) -> dict:
    result = dict(doc)
    for field in _INVOICE_ENC:
        if field in result:
            result[field] = encrypt_json(result[field])
    return result


def _decrypt_invoice(doc: dict) -> dict:
    result = dict(doc)
    for field in _INVOICE_ENC:
        if field in result:
            result[field] = decrypt_json(result[field])
    return result


def create_invoice(data: dict) -> str:
    db = _db()
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    if "customer_id" in data:
        data["customer_id_hash"] = make_hash(data["customer_id"])
    ref = db.collection(INVOICES_COLLECTION).document()
    data["id"] = ref.id
    ref.set(_encrypt_invoice(data))
    return ref.id


def list_invoices() -> list[dict]:
    db = _db()
    docs = list(db.collection(INVOICES_COLLECTION).stream())
    results = [_decrypt_invoice(d.to_dict()) for d in docs]
    results.sort(key=lambda inv: inv.get("created_at", ""), reverse=True)
    return results


def list_invoices_by_date_range(start_date: str, end_date: str) -> list[dict]:
    """Return invoices whose created_at falls within [start_date, end_date].

    Dates should be ISO-8601 date strings (e.g. '2026-03-01').
    Comparison works because created_at is stored as a full ISO-8601 string.
    """
    all_invoices = list_invoices()
    end_inclusive = end_date + "T99"
    return [
        inv for inv in all_invoices
        if start_date <= inv.get("created_at", "") <= end_inclusive
    ]


def get_invoice_by_id(invoice_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(INVOICES_COLLECTION).document(invoice_id).get()
    if not doc.exists:
        return None
    return _decrypt_invoice(doc.to_dict())
