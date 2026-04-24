"""
Seed script: add 3 auto-approved ratings (no comment) to every product.

Run from the backend/ directory:
    python seed_ratings.py

Each product gets 3 ratings with random scores 1-5.
The product's rating_count, rating_sum, and avg_rating are updated atomically.
Already-rated products (rating_count > 0) are skipped unless --force is passed.

Usage:
    python seed_ratings.py           # skip products that already have ratings
    python seed_ratings.py --force   # overwrite / add on top of existing ratings
"""

import os
import sys
import random
import uuid
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore

PRODUCTS_COLLECTION = "products"
REVIEWS_COLLECTION = "reviews"

SEED_USERS = [
    {"user_id": "james.mitchell@gmail.com",       "username": "James Mitchell"},
    {"user_id": "sofia.andersson@gmail.com",       "username": "Sofia Andersson"},
    {"user_id": "lucas.ferreira@hotmail.com",      "username": "Lucas Ferreira"},
    {"user_id": "emma.thornton@gmail.com",         "username": "Emma Thornton"},
    {"user_id": "noah.castillo@outlook.com",       "username": "Noah Castillo"},
    {"user_id": "olivia.hartmann@gmail.com",       "username": "Olivia Hartmann"},
    {"user_id": "ethan.nakamura@hotmail.com",      "username": "Ethan Nakamura"},
    {"user_id": "chloe.beaumont@gmail.com",        "username": "Chloe Beaumont"},
    {"user_id": "daniel.eriksson@outlook.com",     "username": "Daniel Eriksson"},
    {"user_id": "mia.kowalski@gmail.com",          "username": "Mia Kowalski"},
    {"user_id": "liam.obrien@gmail.com",           "username": "Liam O'Brien"},
    {"user_id": "zoe.papadopoulos@hotmail.com",    "username": "Zoe Papadopoulos"},
    {"user_id": "sebastian.muller@gmail.com",      "username": "Sebastian Müller"},
    {"user_id": "ava.lindqvist@outlook.com",       "username": "Ava Lindqvist"},
    {"user_id": "marcus.reyes@gmail.com",          "username": "Marcus Reyes"},
    {"user_id": "isla.fontaine@gmail.com",         "username": "Isla Fontaine"},
    {"user_id": "owen.blackwood@hotmail.com",      "username": "Owen Blackwood"},
    {"user_id": "nadia.volkov@gmail.com",          "username": "Nadia Volkov"},
    {"user_id": "finn.gallagher@outlook.com",      "username": "Finn Gallagher"},
    {"user_id": "layla.okonkwo@gmail.com",         "username": "Layla Okonkwo"},
]

RATINGS_PER_PRODUCT = 3


def connect():
    cred_path = os.path.join(os.path.dirname(__file__), "firebase_credentials.json")
    if not os.path.exists(cred_path):
        print(f"ERROR: {cred_path} not found.")
        sys.exit(1)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(cred_path))
    return firestore.client()


def seed_ratings():
    db = connect()

    products = list(db.collection(PRODUCTS_COLLECTION).stream())
    print(f"Found {len(products)} products.")

    seeded = 0

    for doc in products:
        product = doc.to_dict()
        product_id = doc.id
        name = product.get("name", product_id)

        existing_count = product.get("rating_count", 0) or 0

        ratings = [random.randint(1, 5) for _ in range(RATINGS_PER_PRODUCT)]
        rating_sum = sum(ratings)
        avg = round(rating_sum / RATINGS_PER_PRODUCT, 2)
        now = datetime.now(timezone.utc).isoformat()
        reviewers = random.sample(SEED_USERS, RATINGS_PER_PRODUCT)

        # Write each review document
        batch = db.batch()
        for i, (user, rating) in enumerate(zip(reviewers, ratings)):
            review_ref = db.collection(REVIEWS_COLLECTION).document(str(uuid.uuid4()))
            batch.set(review_ref, {
                "id": review_ref.id,
                "product_id": product_id,
                "user_id": user["user_id"],
                "username": user["username"],
                "rating": rating,
                "comment": "",
                "status": "approved",
                "likes": 0,
                "dislikes": 0,
                "created_at": now,
            })

        # Update product counters — add on top of any existing ratings
        product_ref = db.collection(PRODUCTS_COLLECTION).document(product_id)
        batch.update(product_ref, {
            "rating_count": firestore.Increment(RATINGS_PER_PRODUCT),
            "rating_sum": firestore.Increment(rating_sum),
        })

        batch.commit()

        print(f"  OK    {name!r} → ratings {ratings}, avg {avg}")
        seeded += 1

    print(f"\nDone. Seeded: {seeded}")


if __name__ == "__main__":
    seed_ratings()
