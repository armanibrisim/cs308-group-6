from datetime import datetime, timezone
from typing import Optional

from google.cloud.firestore_v1 import FieldFilter

from app.firebase.client import get_firebase_app
import firebase_admin.firestore as firestore_module

REVIEWS_COLLECTION = "reviews"
REVIEW_VOTES_COLLECTION = "review_votes"


def _db():
    get_firebase_app()
    return firestore_module.client()


def create_review(data: dict) -> str:
    db = _db()
    now = datetime.now(timezone.utc).isoformat()
    data["created_at"] = now
    data["status"] = "pending"
    data["likes"] = 0
    data["dislikes"] = 0

    ref = db.collection(REVIEWS_COLLECTION).document()
    data["id"] = ref.id
    ref.set(data)
    return ref.id


def get_reviews_by_product(product_id: str, approved_only: bool = True) -> list[dict]:
    db = _db()
    query = db.collection(REVIEWS_COLLECTION).where(
        filter=FieldFilter("product_id", "==", product_id)
    )
    if approved_only:
        query = query.where(filter=FieldFilter("status", "==", "approved"))
    docs = query.stream()
    return [d.to_dict() for d in docs]


def get_pending_reviews() -> list[dict]:
    db = _db()
    docs = (
        db.collection(REVIEWS_COLLECTION)
        .where(filter=FieldFilter("status", "==", "pending"))
        .stream()
    )
    return [d.to_dict() for d in docs]


def get_review_by_id(review_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(REVIEWS_COLLECTION).document(review_id).get()
    if not doc.exists:
        return None
    return doc.to_dict()


def get_review_by_user_and_product(user_id: str, product_id: str) -> Optional[dict]:
    db = _db()
    docs = (
        db.collection(REVIEWS_COLLECTION)
        .where(filter=FieldFilter("user_id", "==", user_id))
        .where(filter=FieldFilter("product_id", "==", product_id))
        .limit(1)
        .stream()
    )
    results = list(docs)
    return results[0].to_dict() if results else None


def update_review_status(review_id: str, new_status: str) -> None:
    db = _db()
    db.collection(REVIEWS_COLLECTION).document(review_id).update({"status": new_status})


def get_user_vote(review_id: str, user_id: str) -> str | None:
    """Return 'like', 'dislike', or None for this user's vote on this review."""
    db = _db()
    doc = db.collection(REVIEW_VOTES_COLLECTION).document(f"{review_id}_{user_id}").get()
    if not doc.exists:
        return None
    return doc.to_dict().get("vote_type")


def get_user_votes_for_product(user_id: str, product_id: str) -> dict[str, str]:
    """Return {review_id: vote_type} for all of this user's votes on a product's reviews."""
    db = _db()
    docs = (
        db.collection(REVIEW_VOTES_COLLECTION)
        .where(filter=FieldFilter("user_id", "==", user_id))
        .where(filter=FieldFilter("product_id", "==", product_id))
        .stream()
    )
    return {d.to_dict()["review_id"]: d.to_dict()["vote_type"] for d in docs}


def set_vote(review_id: str, user_id: str, product_id: str, vote_type: str) -> None:
    """Create or overwrite a vote and atomically update the review counts."""
    db = _db()
    vote_ref = db.collection(REVIEW_VOTES_COLLECTION).document(f"{review_id}_{user_id}")
    review_ref = db.collection(REVIEWS_COLLECTION).document(review_id)

    existing = vote_ref.get()
    old_type = existing.to_dict().get("vote_type") if existing.exists else None

    # Build the count delta for the review document
    count_update: dict = {}
    if old_type and old_type != vote_type:
        # Switching vote: decrement old, increment new
        count_update[old_type + "s"] = firestore_module.Increment(-1)
        count_update[vote_type + "s"] = firestore_module.Increment(1)
    elif not old_type:
        # New vote
        count_update[vote_type + "s"] = firestore_module.Increment(1)
    # If old_type == vote_type the caller should have called remove_vote instead

    vote_ref.set({"review_id": review_id, "user_id": user_id, "product_id": product_id, "vote_type": vote_type})
    if count_update:
        review_ref.update(count_update)


def remove_vote(review_id: str, user_id: str, vote_type: str) -> None:
    """Delete a vote and decrement the corresponding count on the review."""
    db = _db()
    db.collection(REVIEW_VOTES_COLLECTION).document(f"{review_id}_{user_id}").delete()
    db.collection(REVIEWS_COLLECTION).document(review_id).update(
        {vote_type + "s": firestore_module.Increment(-1)}
    )


def get_all_reviews(
    status: str | None = None,
    limit: int = 50,
    start_after: str | None = None,
) -> list[dict]:
    """Fetch all reviews with optional status filter, ordered by created_at desc, paginated."""
    db = _db()
    query = db.collection(REVIEWS_COLLECTION).order_by("created_at", direction="DESCENDING")

    if status:
        query = query.where(filter=FieldFilter("status", "==", status))

    if start_after:
        query = query.start_after({"created_at": start_after})

    query = query.limit(limit)
    return [d.to_dict() for d in query.stream()]


def get_approved_ratings_for_product(product_id: str) -> list[int]:
    """Return list of ratings for all approved reviews of a product (for avg calculation)."""
    db = _db()
    docs = (
        db.collection(REVIEWS_COLLECTION)
        .where(filter=FieldFilter("product_id", "==", product_id))
        .where(filter=FieldFilter("status", "==", "approved"))
        .stream()
    )
    return [d.to_dict().get("rating", 0) for d in docs]
