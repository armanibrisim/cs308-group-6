from datetime import datetime, timezone
from typing import Optional

from google.cloud.firestore_v1 import FieldFilter

from app.firebase.client import get_firebase_app
import firebase_admin.firestore as firestore_module

from app.utils.encryption import decrypt_json, encrypt_json, make_hash

REVIEWS_COLLECTION = "reviews"
REVIEW_VOTES_COLLECTION = "review_votes"

# product_id and status stay unencrypted (used for Firestore queries by admins/product pages).
# user_id_hash stays unencrypted (HMAC query key).
_REVIEW_ENC = {"user_id", "username", "comment", "rating", "created_at", "likes", "dislikes"}

# In review_votes, user_id_hash and product_id_hash stay unencrypted (query keys).
_VOTE_ENC = {"review_id", "user_id", "product_id", "vote_type"}


def _db():
    get_firebase_app()
    return firestore_module.client()


def _encrypt_review(doc: dict) -> dict:
    result = dict(doc)
    for field in _REVIEW_ENC:
        if field in result:
            result[field] = encrypt_json(result[field])
    return result


def _decrypt_review(doc: dict) -> dict:
    result = dict(doc)
    for field in _REVIEW_ENC:
        if field in result:
            result[field] = decrypt_json(result[field])
    return result


def _enc_review_update(updates: dict) -> dict:
    """Encrypt only the fields that belong to _REVIEW_ENC; leave others as-is."""
    return {
        k: (encrypt_json(v) if k in _REVIEW_ENC else v)
        for k, v in updates.items()
    }


def _encrypt_vote(doc: dict) -> dict:
    result = dict(doc)
    for field in _VOTE_ENC:
        if field in result:
            result[field] = encrypt_json(result[field])
    return result


def _decrypt_vote(doc: dict) -> dict:
    result = dict(doc)
    for field in _VOTE_ENC:
        if field in result:
            result[field] = decrypt_json(result[field])
    return result


def create_review(data: dict) -> str:
    """Atomically create a review. Raises ValueError if user already reviewed this product."""
    db = _db()
    now = datetime.now(timezone.utc).isoformat()
    data["created_at"] = now
    data["status"] = "pending"  # unencrypted — needed for moderation queries
    data["likes"] = 0
    data["dislikes"] = 0
    if "user_id" in data:
        data["user_id_hash"] = make_hash(data["user_id"])

    # Deterministic doc ID: one review per (user, product) pair enforced at DB level.
    doc_id = make_hash(f"{data['user_id']}:{data['product_id']}")
    ref = db.collection(REVIEWS_COLLECTION).document(doc_id)
    data["id"] = doc_id

    @firestore_module.transactional
    def _txn(transaction):
        snapshot = ref.get(transaction=transaction)
        if snapshot.exists:
            raise ValueError("You have already reviewed this product.")
        transaction.set(ref, _encrypt_review(data))

    _txn(db.transaction())
    return doc_id


def get_reviews_by_product(product_id: str, approved_only: bool = True) -> list[dict]:
    db = _db()
    query = db.collection(REVIEWS_COLLECTION).where(
        filter=FieldFilter("product_id", "==", product_id)
    )
    if approved_only:
        query = query.where(filter=FieldFilter("status", "==", "approved"))
    docs = query.stream()
    return [_decrypt_review(d.to_dict()) for d in docs]


def get_pending_reviews() -> list[dict]:
    db = _db()
    docs = (
        db.collection(REVIEWS_COLLECTION)
        .where(filter=FieldFilter("status", "==", "pending"))
        .stream()
    )
    return [_decrypt_review(d.to_dict()) for d in docs]


def get_review_by_id(review_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(REVIEWS_COLLECTION).document(review_id).get()
    if not doc.exists:
        return None
    return _decrypt_review(doc.to_dict())


def get_review_by_user_and_product(user_id: str, product_id: str) -> Optional[dict]:
    db = _db()
    docs = (
        db.collection(REVIEWS_COLLECTION)
        .where(filter=FieldFilter("user_id_hash", "==", make_hash(user_id)))
        .where(filter=FieldFilter("product_id", "==", product_id))
        .limit(1)
        .stream()
    )
    results = list(docs)
    return _decrypt_review(results[0].to_dict()) if results else None


def update_review_status(review_id: str, new_status: str) -> None:
    # status is NOT encrypted — write directly.
    db = _db()
    db.collection(REVIEWS_COLLECTION).document(review_id).update({"status": new_status})


def transition_review_status(review_id: str, expected: str, new_status: str) -> None:
    """Atomically transition status from expected → new_status.
    Raises ValueError if the current status is not expected
    (another concurrent request already resolved this review)."""
    db = _db()
    ref = db.collection(REVIEWS_COLLECTION).document(review_id)

    @firestore_module.transactional
    def _txn(transaction):
        doc = ref.get(transaction=transaction)
        if not doc.exists:
            raise ValueError("Review not found.")
        # status is stored unencrypted — read directly
        if doc.to_dict().get("status") != expected:
            raise ValueError(f"Review is no longer {expected}.")
        transaction.update(ref, {"status": new_status})

    _txn(db.transaction())


def update_review(review_id: str, updates: dict) -> None:
    db = _db()
    db.collection(REVIEWS_COLLECTION).document(review_id).update(_enc_review_update(updates))


def delete_review(review_id: str) -> None:
    db = _db()
    db.collection(REVIEWS_COLLECTION).document(review_id).delete()


def get_user_vote(review_id: str, user_id: str) -> str | None:
    """Return 'like', 'dislike', or None for this user's vote on this review."""
    db = _db()
    doc = db.collection(REVIEW_VOTES_COLLECTION).document(f"{review_id}_{user_id}").get()
    if not doc.exists:
        return None
    return _decrypt_vote(doc.to_dict()).get("vote_type")


def get_user_votes_for_product(user_id: str, product_id: str) -> dict[str, str]:
    """Return {review_id: vote_type} for all of this user's votes on a product's reviews."""
    db = _db()
    docs = (
        db.collection(REVIEW_VOTES_COLLECTION)
        .where(filter=FieldFilter("user_id_hash", "==", make_hash(user_id)))
        .where(filter=FieldFilter("product_id_hash", "==", make_hash(product_id)))
        .stream()
    )
    result = {}
    for d in docs:
        data = _decrypt_vote(d.to_dict())
        if data.get("review_id") and data.get("vote_type"):
            result[data["review_id"]] = data["vote_type"]
    return result


def set_vote(review_id: str, user_id: str, product_id: str, vote_type: str) -> tuple[int, int]:
    """Atomically create or overwrite a vote and update the review counts.
    Returns (likes_delta, dislikes_delta) so callers avoid a re-fetch."""
    db = _db()
    vote_ref = db.collection(REVIEW_VOTES_COLLECTION).document(f"{review_id}_{user_id}")
    review_ref = db.collection(REVIEWS_COLLECTION).document(review_id)

    @firestore_module.transactional
    def _txn(transaction):
        # Authoritative read of existing vote inside the transaction
        vote_doc = vote_ref.get(transaction=transaction)
        old_type = _decrypt_vote(vote_doc.to_dict()).get("vote_type") if vote_doc.exists else None

        # Compute delta based on old vs new vote type
        likes_delta = dislikes_delta = 0
        if old_type and old_type != vote_type:
            likes_delta, dislikes_delta = (1, -1) if vote_type == "like" else (-1, 1)
        elif not old_type:
            if vote_type == "like":
                likes_delta = 1
            else:
                dislikes_delta = 1
        # old_type == vote_type → delta stays 0 (already voted this way, idempotent)

        # Write vote document inside the same transaction
        transaction.set(vote_ref, {
            **_encrypt_vote({
                "review_id": review_id,
                "user_id": user_id,
                "product_id": product_id,
                "vote_type": vote_type,
            }),
            "user_id_hash": make_hash(user_id),
            "product_id_hash": make_hash(product_id),
        })

        # Update review counters only if something actually changed
        if likes_delta != 0 or dislikes_delta != 0:
            review_doc = review_ref.get(transaction=transaction)
            if review_doc.exists:
                data = _decrypt_review(review_doc.to_dict())
                new_likes = max(0, (data.get("likes") or 0) + likes_delta)
                new_dislikes = max(0, (data.get("dislikes") or 0) + dislikes_delta)
                transaction.update(review_ref, {
                    "likes": encrypt_json(new_likes),
                    "dislikes": encrypt_json(new_dislikes),
                })

        return likes_delta, dislikes_delta

    return _txn(db.transaction())


def remove_vote(review_id: str, user_id: str, vote_type: str) -> tuple[int, int]:
    """Atomically delete a vote and decrement the corresponding count on the review.
    Returns (likes_delta, dislikes_delta) so callers avoid a re-fetch."""
    db = _db()
    vote_ref = db.collection(REVIEW_VOTES_COLLECTION).document(f"{review_id}_{user_id}")
    review_ref = db.collection(REVIEWS_COLLECTION).document(review_id)

    @firestore_module.transactional
    def _txn(transaction):
        vote_doc = vote_ref.get(transaction=transaction)
        if not vote_doc.exists:
            # Already removed by a concurrent request — nothing to do
            return
        transaction.delete(vote_ref)
        review_doc = review_ref.get(transaction=transaction)
        if review_doc.exists:
            data = _decrypt_review(review_doc.to_dict())
            if vote_type == "like":
                new_val = max(0, (data.get("likes") or 0) - 1)
                transaction.update(review_ref, {"likes": encrypt_json(new_val)})
            else:
                new_val = max(0, (data.get("dislikes") or 0) - 1)
                transaction.update(review_ref, {"dislikes": encrypt_json(new_val)})

    _txn(db.transaction())
    return (-1, 0) if vote_type == "like" else (0, -1)


def get_all_reviews(
    status: str | None = None,
    limit: int = 50,
    start_after: str | None = None,
) -> list[dict]:
    """Fetch all reviews with optional status filter, ordered by created_at desc."""
    db = _db()

    if status:
        docs = (
            db.collection(REVIEWS_COLLECTION)
            .where(filter=FieldFilter("status", "==", status))
            .stream()
        )
    else:
        docs = db.collection(REVIEWS_COLLECTION).stream()

    results = [_decrypt_review(d.to_dict()) for d in docs]
    results.sort(key=lambda r: r.get("created_at", ""), reverse=True)

    if start_after:
        results = [r for r in results if r.get("created_at", "") < start_after]

    return results[:limit]


def get_counted_ratings_for_product(product_id: str) -> list[int]:
    """Return ratings for all counted reviews (approved + rejected) of a product."""
    db = _db()
    docs = (
        db.collection(REVIEWS_COLLECTION)
        .where(filter=FieldFilter("product_id", "==", product_id))
        .stream()
    )
    return [
        decrypt_json(d.to_dict().get("rating", 0))
        for d in docs
        if d.to_dict().get("status") in ("approved", "rejected")
    ]
