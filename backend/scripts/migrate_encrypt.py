"""One-time idempotent migration script: encrypt all existing Firestore documents.

Run from the backend/ directory:
    python scripts/migrate_encrypt.py

Safe to re-run — decrypt_json falls back gracefully on already-encrypted values,
and the script always writes the freshly-encrypted version back.
"""
from __future__ import annotations

import os
import sys

# Allow imports from the app package.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

import firebase_admin
from firebase_admin import credentials, firestore

from app.utils.encryption import decrypt_json, encrypt_json, make_hash


def _init_firebase():
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase_credentials.json")
    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    return firestore.client()


# ── Field maps ────────────────────────────────────────────────────────────────

_USER_ENC = {"first_name", "last_name", "email", "role", "tax_id", "created_at",
             "addresses", "saved_cards"}

_ORDER_ENC = {
    "customer_id", "customer_email", "customer_name", "delivery_address",
    "items", "subtotal", "discount_amount", "promo_code", "tax", "shipping",
    "total_amount", "status", "invoice_id", "created_at", "updated_at",
    "delivered_at", "refunded_items",
}

_INVOICE_ENC = {
    "customer_id", "customer_email", "customer_name", "customer_tax_id",
    "delivery_address", "items", "subtotal", "discount_amount", "promo_code",
    "tax", "shipping", "total_amount", "created_at",
}

_DELIVERY_ENC = {
    "customer_id", "product_id", "product_name", "quantity",
    "total_price", "delivery_address", "is_completed", "order_id", "created_at",
}

_RETURN_ENC = {
    "customer_id", "customer_email", "customer_name",
    "order_id", "product_id", "product_name",
    "quantity", "total_price", "reason", "status", "created_at",
}

_NOTIF_ENC = {"user_id", "message", "product_id", "product_name", "read", "created_at"}

_REVIEW_ENC = {"user_id", "username", "comment", "rating", "created_at", "likes", "dislikes"}

_VOTE_ENC = {"review_id", "user_id", "product_id", "vote_type"}

_PROMO_ENC = {"code", "discount_percent", "max_uses", "uses", "expires_at", "is_active", "created_at"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _migrate_doc(doc, enc_fields: set, hash_fields: dict | None = None):
    """Decrypt then re-encrypt every field in enc_fields, add any HMAC hashes."""
    data = doc.to_dict()
    if data is None:
        return

    updates = {}

    for field in enc_fields:
        if field in data:
            plain = decrypt_json(data[field])
            updates[field] = encrypt_json(plain)

    # Add HMAC hash fields if not already present.
    if hash_fields:
        for src_field, hash_field in hash_fields.items():
            if hash_field not in data and src_field in data:
                plain_src = decrypt_json(data[src_field])
                if plain_src is not None:
                    updates[hash_field] = make_hash(str(plain_src))

    if updates:
        doc.reference.update(updates)


def _migrate_collection(db, collection: str, enc_fields: set,
                        hash_fields: dict | None = None, label: str = ""):
    docs = list(db.collection(collection).stream())
    label = label or collection
    print(f"[{label}] migrating {len(docs)} documents ...")
    for i, doc in enumerate(docs, 1):
        try:
            _migrate_doc(doc, enc_fields, hash_fields)
        except Exception as exc:
            print(f"  WARNING: doc {doc.id} failed — {exc}")
        if i % 50 == 0:
            print(f"  ... {i}/{len(docs)}")
    print(f"[{label}] done.")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("Initialising Firebase ...")
    db = _init_firebase()
    print("Starting migration — this is idempotent, safe to re-run.\n")

    _migrate_collection(db, "users", _USER_ENC)

    _migrate_collection(db, "orders", _ORDER_ENC,
                        hash_fields={"customer_id": "customer_id_hash"})

    _migrate_collection(db, "invoices", _INVOICE_ENC,
                        hash_fields={"customer_id": "customer_id_hash"})

    _migrate_collection(db, "deliveries", _DELIVERY_ENC)

    _migrate_collection(db, "return_requests", _RETURN_ENC,
                        hash_fields={
                            "customer_id": "customer_id_hash",
                            "order_id": "order_id_hash",
                        })

    _migrate_collection(db, "notifications", _NOTIF_ENC,
                        hash_fields={"user_id": "user_id_hash"})

    _migrate_collection(db, "reviews", _REVIEW_ENC,
                        hash_fields={"user_id": "user_id_hash"})

    _migrate_collection(db, "review_votes", _VOTE_ENC,
                        hash_fields={
                            "user_id": "user_id_hash",
                            "product_id": "product_id_hash",
                        })

    _migrate_collection(db, "promo_codes", _PROMO_ENC,
                        hash_fields={"code": "code_hash"})

    # Wishlists — product_ids only
    _migrate_collection(db, "wishlists", {"product_ids"})

    # Carts — items and updated_at
    _migrate_collection(db, "carts", {"items", "updated_at"})

    print("\nMigration complete.")


if __name__ == "__main__":
    main()
