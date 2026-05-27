"""Assign sequential integer user_id to all existing users.

Run from the backend/ directory:
    python scripts/migrate_user_ids.py

Idempotent: users that already have a user_id are skipped.
Users without a user_id are sorted by created_at (ascending) and assigned
IDs starting from the current user_count + 1.
"""
from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from firebase_admin import firestore

from app.firebase.client import get_firebase_app
from app.utils.encryption import decrypt_json, encrypt_json

_SENTINEL = object()


def _decrypt_user(doc: dict) -> dict:
    enc_fields = {"first_name", "last_name", "email", "role", "tax_id",
                  "created_at", "addresses", "saved_cards", "user_id"}
    result = dict(doc)
    for f in enc_fields:
        if f in result:
            result[f] = decrypt_json(result[f])
    return result


def main() -> None:
    get_firebase_app()
    db = firestore.client()

    counters_ref = db.collection("meta").document("counters")
    users_col = db.collection("users")

    # Read current counter baseline
    snap = counters_ref.get()
    baseline = (snap.to_dict() or {}).get("user_count") or 0
    print(f"Current user_count baseline: {baseline}")

    # Fetch and decrypt all users
    all_docs = list(users_col.stream())
    print(f"Total users: {len(all_docs)}")

    already_assigned = []
    needs_id = []

    for doc in all_docs:
        data = _decrypt_user(doc.to_dict())
        uid = data.get("user_id")
        if uid:
            already_assigned.append((doc.id, uid))
        else:
            needs_id.append((doc.id, data))

    print(f"  Already have user_id: {len(already_assigned)}")
    print(f"  Need assignment:      {len(needs_id)}")

    if not needs_id:
        print("Nothing to migrate.")
        return

    # Sort by created_at ascending so IDs follow registration order
    needs_id.sort(key=lambda x: x[1].get("created_at") or "")

    next_id = baseline + 1
    for doc_id, _ in needs_id:
        db.collection("users").document(doc_id).update(
            {"user_id": encrypt_json(next_id)}
        )
        print(f"  {doc_id} → user_id #{next_id}")
        next_id += 1

    final_count = next_id - 1
    counters_ref.set({"user_count": final_count}, merge=True)
    print(f"\nDone. user_count set to {final_count}.")


if __name__ == "__main__":
    main()
