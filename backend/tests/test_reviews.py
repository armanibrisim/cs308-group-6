"""
Test cases for the review endpoints.
Run with: pytest tests/test_reviews.py -v
"""

from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token

client = TestClient(app)

CUSTOMER_TOKEN = create_access_token({"sub": "user1@example.com", "email": "user1@example.com", "role": "customer"})
PM_TOKEN = create_access_token({"sub": "pm@example.com", "email": "pm@example.com", "role": "product_manager"})
CUSTOMER_AUTH = {"Authorization": f"Bearer {CUSTOMER_TOKEN}"}
PM_AUTH = {"Authorization": f"Bearer {PM_TOKEN}"}

USER_ID = "user1@example.com"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _review(
    review_id: str = "rev-1",
    product_id: str = "prod-1",
    user_id: str = USER_ID,
    rating: int = 4,
    comment: str = "Great product!",
    status: str = "approved",
    likes: int = 0,
    dislikes: int = 0,
) -> dict:
    return {
        "id": review_id,
        "product_id": product_id,
        "user_id": user_id,
        "username": "Test User",
        "rating": rating,
        "comment": comment,
        "status": status,
        "created_at": "2024-01-01T00:00:00+00:00",
        "likes": likes,
        "dislikes": dislikes,
    }


# ---------------------------------------------------------------------------
# Test 1 — Yorum içeren review pending durumunda oluşturulur
# ---------------------------------------------------------------------------
def test_submit_review_with_comment_stays_pending():
    """
    GIVEN kimliği doğrulanmış bir müşteri, mevcut bir ürün ve önceki review yok
    WHEN  POST /reviews yorum içeren bir review ile çağrıldığında
    THEN  201 döner ve review 'pending' statüsünde olur (yönetici onayı gerekli)
    """
    saved = _review(status="pending", comment="Harika bir ürün!")

    with patch("app.services.review_service.get_user_by_id", return_value={"first_name": "Test", "last_name": "User"}), \
         patch("app.services.review_service.get_product_by_id", return_value={"id": "prod-1", "name": "Test Ürün"}), \
         patch("app.services.review_service.review_repository.get_review_by_user_and_product", return_value=None), \
         patch("app.services.review_service.review_repository.create_review", return_value="rev-1"), \
         patch("app.services.review_service.review_repository.get_review_by_id", return_value=saved):

        resp = client.post(
            "/reviews",
            json={"product_id": "prod-1", "rating": 5, "comment": "Harika bir ürün!"},
            headers=CUSTOMER_AUTH,
        )

    assert resp.status_code == 201
    assert resp.json()["status"] == "pending"


# ---------------------------------------------------------------------------
# Test 2 — Yorumsuz (sadece rating) review otomatik olarak onaylanır
# ---------------------------------------------------------------------------
def test_submit_rating_only_review_auto_approved():
    """
    GIVEN kimliği doğrulanmış bir müşteri ve yorum içermeyen bir review
    WHEN  POST /reviews boş comment ile çağrıldığında
    THEN  201 döner ve review 'approved' statüsünde olur (yönetici onayı gerekmez)
    """
    saved = _review(status="approved", comment="")

    with patch("app.services.review_service.get_user_by_id", return_value={"first_name": "Test", "last_name": "User"}), \
         patch("app.services.review_service.get_product_by_id", return_value={"id": "prod-1", "name": "Test Ürün"}), \
         patch("app.services.review_service.review_repository.get_review_by_user_and_product", return_value=None), \
         patch("app.services.review_service.review_repository.create_review", return_value="rev-1"), \
         patch("app.services.review_service.review_repository.update_review_status"), \
         patch("app.services.review_service.update_product_rating_counters"), \
         patch("app.services.review_service.review_repository.get_review_by_id", return_value=saved):

        resp = client.post(
            "/reviews",
            json={"product_id": "prod-1", "rating": 4, "comment": ""},
            headers=CUSTOMER_AUTH,
        )

    assert resp.status_code == 201
    assert resp.json()["status"] == "approved"


# ---------------------------------------------------------------------------
# Test 3 — Kullanıcı aynı ürüne iki kez review yapamaz
# ---------------------------------------------------------------------------
def test_submit_review_duplicate_returns_409():
    """
    GIVEN daha önce aynı ürüne review yapmış bir kullanıcı
    WHEN  POST /reviews tekrar aynı ürün için çağrıldığında
    THEN  409 Conflict döner
    """
    existing_review = _review()

    with patch("app.services.review_service.get_user_by_id", return_value={"first_name": "Test", "last_name": "User"}), \
         patch("app.services.review_service.get_product_by_id", return_value={"id": "prod-1", "name": "Test Ürün"}), \
         patch("app.services.review_service.review_repository.get_review_by_user_and_product", return_value=existing_review):

        resp = client.post(
            "/reviews",
            json={"product_id": "prod-1", "rating": 3, "comment": "Tekrar yazmaya çalışıyorum"},
            headers=CUSTOMER_AUTH,
        )

    assert resp.status_code == 409
    assert "already reviewed" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 4 — Onaylı review'lara like verilebilir
# ---------------------------------------------------------------------------
def test_vote_on_approved_review_returns_updated_counts():
    """
    GIVEN onaylanmış bir review ve kimliği doğrulanmış bir kullanıcı
    WHEN  POST /reviews/{review_id}/vote like ile çağrıldığında
    THEN  200 döner ve güncel likes/dislikes/user_vote değerleri gelir
    """
    approved_review = _review(status="approved", likes=3, dislikes=1)

    with patch("app.services.review_service.review_repository.get_review_by_id", return_value=approved_review), \
         patch("app.services.review_service.review_repository.get_user_vote", return_value=None), \
         patch("app.services.review_service.review_repository.set_vote", return_value=(1, 0)):

        resp = client.post(
            "/reviews/rev-1/vote",
            json={"vote_type": "like"},
            headers=CUSTOMER_AUTH,
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["likes"] == 4
    assert body["dislikes"] == 1
    assert body["user_vote"] == "like"


# ---------------------------------------------------------------------------
# Test 5 — Ürün yöneticisi pending review'ı onaylayabilir
# ---------------------------------------------------------------------------
def test_product_manager_can_approve_pending_review():
    """
    GIVEN product_manager rolüne sahip kullanıcı ve pending statüsünde bir review
    WHEN  PUT /reviews/{review_id}/status 'approved' ile çağrıldığında
    THEN  200 döner ve review 'approved' statüsünde olur
    """
    pending_review = _review(status="pending")
    approved_review = {**pending_review, "status": "approved"}

    with patch("app.services.review_service.review_repository.get_review_by_id", return_value=pending_review), \
         patch("app.services.review_service.review_repository.update_review_status"), \
         patch("app.services.review_service.update_product_rating_counters"):

        resp = client.put(
            "/reviews/rev-1/status",
            json={"status": "approved"},
            headers=PM_AUTH,
        )

    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"
