"""
Seed script: set a random purchase_count (1-20) on every product.

Run from the backend/ directory:
    python3 seed_purchase_counts.py
"""

import os
import sys
import random

import firebase_admin
from firebase_admin import credentials, firestore

PRODUCTS_COLLECTION = "products"


def connect():
    cred_path = os.path.join(os.path.dirname(__file__), "firebase_credentials.json")
    if not os.path.exists(cred_path):
        print(f"ERROR: {cred_path} not found.")
        sys.exit(1)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(cred_path))
    return firestore.client()


def seed_purchase_counts():
    db = connect()

    products = list(db.collection(PRODUCTS_COLLECTION).stream())
    print(f"Found {len(products)} products.")

    for doc in products:
        product = doc.to_dict()
        name = product.get("name", doc.id)
        count = random.randint(5, 20)

        db.collection(PRODUCTS_COLLECTION).document(doc.id).update({
            "purchase_count": count
        })

        print(f"  OK  {name!r} → purchase_count = {count}")

    print(f"\nDone. Updated {len(products)} products.")


if __name__ == "__main__":
    seed_purchase_counts()
