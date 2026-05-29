"""
Unit tests for address and saved card endpoints.

Endpoints covered:
  POST   /auth/me/addresses
  POST   /auth/me/cards

Run with: pytest tests/test_addresses_cards.py -v
"""

import threading
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token

client = TestClient(app)

CUSTOMER_TOKEN = create_access_token(
    {"sub": "user@example.com", "email": "user@example.com", "role": "customer"}
)
AUTH = {"Authorization": f"Bearer {CUSTOMER_TOKEN}"}
USER_ID = "user@example.com"

ADDRESS_PAYLOAD = {
    "label": "Home",
    "full_address": "123 Main Street, Istanbul, Turkey",
    "is_default": False,
}

CARD_PAYLOAD = {
    "label": "My Visa",
    "last4": "4242",
    "card_holder_name": "Test User",
    "expiry": "12/27",
    "is_default": False,
}

_ADDR = {"id": "addr-1", "label": "Home", "full_address": "123 Main St", "is_default": True}
_CARD = {"id": "card-1", "label": "Visa", "last4": "4242", "card_holder_name": "Test User", "expiry": "12/27", "is_default": True}


# ---------------------------------------------------------------------------
# Test 1 — Add address success → 201
# ---------------------------------------------------------------------------
def test_add_address_success():
    """
    GIVEN an authenticated customer with fewer than 10 addresses
    WHEN  POST /auth/me/addresses is called with valid data
    THEN  201 Created and the new address is returned
    """
    with patch("app.routers.auth.get_addresses", return_value=[]), \
         patch("app.routers.auth.add_address", return_value=_ADDR):

        resp = client.post("/auth/me/addresses", json=ADDRESS_PAYLOAD, headers=AUTH)

    assert resp.status_code == 201
    assert resp.json()["label"] == "Home"


# ---------------------------------------------------------------------------
# Test 2 — Add address at limit (10) → 400 from pre-check
# ---------------------------------------------------------------------------
def test_add_address_at_limit_returns_400():
    """
    GIVEN a customer who already has 10 saved addresses
    WHEN  POST /auth/me/addresses is called
    THEN  400 Bad Request with "Maximum of 10 addresses" in detail
    """
    full_list = [_ADDR] * 10

    with patch("app.routers.auth.get_addresses", return_value=full_list):
        resp = client.post("/auth/me/addresses", json=ADDRESS_PAYLOAD, headers=AUTH)

    assert resp.status_code == 400
    assert "10" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Test 3 — DB-level limit: add_address raises ValueError → 400
# ---------------------------------------------------------------------------
def test_add_address_db_level_limit_returns_400():
    """
    GIVEN the pre-check passes (get_addresses returns 9 items)
    BUT   add_address raises ValueError because the atomic transaction
          found the list already at 10 (concurrent request beat this one)
    WHEN  POST /auth/me/addresses is called
    THEN  400 Bad Request
    """
    nine_addresses = [_ADDR] * 9

    with patch("app.routers.auth.get_addresses", return_value=nine_addresses), \
         patch("app.routers.auth.add_address",
               side_effect=ValueError("Maximum of 10 addresses allowed.")):

        resp = client.post("/auth/me/addresses", json=ADDRESS_PAYLOAD, headers=AUTH)

    assert resp.status_code == 400
    assert "10" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Test 4 — Concurrent address adds at count=9: only one succeeds
# ---------------------------------------------------------------------------
def test_concurrent_add_address_only_one_succeeds():
    """
    GIVEN a customer with 9 addresses and two simultaneous POST requests
    WHEN  both threads fire at the same time
    THEN  exactly 1 returns 201 and 1 returns 400
          (the atomic transaction rejects the second request)
    """
    lock = threading.Lock()
    call_count = {"n": 0}

    def add_address_side_effect(user_id, label, full_address, is_default):
        with lock:
            call_count["n"] += 1
            n = call_count["n"]
        if n > 1:
            raise ValueError("Maximum of 10 addresses allowed.")
        return _ADDR

    nine_addresses = [_ADDR] * 9
    results = []
    results_lock = threading.Lock()

    with patch("app.routers.auth.get_addresses", return_value=nine_addresses), \
         patch("app.routers.auth.add_address", side_effect=add_address_side_effect):

        def do_add():
            resp = client.post("/auth/me/addresses", json=ADDRESS_PAYLOAD, headers=AUTH)
            with results_lock:
                results.append(resp.status_code)

        threads = [threading.Thread(target=do_add) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

    assert results.count(201) == 1, f"Expected 1 success, got: {results}"
    assert results.count(400) == 1, f"Expected 1 rejection, got: {results}"


# ---------------------------------------------------------------------------
# Test 5 — Add card success → 201
# ---------------------------------------------------------------------------
def test_add_card_success():
    """
    GIVEN an authenticated customer with fewer than 10 saved cards
    WHEN  POST /auth/me/cards is called with valid data
    THEN  201 Created and the new card is returned
    """
    with patch("app.routers.auth.get_saved_cards", return_value=[]), \
         patch("app.routers.auth.add_saved_card", return_value=_CARD):

        resp = client.post("/auth/me/cards", json=CARD_PAYLOAD, headers=AUTH)

    assert resp.status_code == 201
    assert resp.json()["last4"] == "4242"


# ---------------------------------------------------------------------------
# Test 6 — Add card at limit (10) → 400 from pre-check
# ---------------------------------------------------------------------------
def test_add_card_at_limit_returns_400():
    """
    GIVEN a customer who already has 10 saved cards
    WHEN  POST /auth/me/cards is called
    THEN  400 Bad Request with "Maximum of 10" in detail
    """
    full_list = [_CARD] * 10

    with patch("app.routers.auth.get_saved_cards", return_value=full_list):
        resp = client.post("/auth/me/cards", json=CARD_PAYLOAD, headers=AUTH)

    assert resp.status_code == 400
    assert "10" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Test 7 — DB-level card limit: add_saved_card raises ValueError → 400
# ---------------------------------------------------------------------------
def test_add_card_db_level_limit_returns_400():
    """
    GIVEN the pre-check passes (get_saved_cards returns 9 items)
    BUT   add_saved_card raises ValueError because the atomic transaction
          found the list already at 10 (concurrent request beat this one)
    WHEN  POST /auth/me/cards is called
    THEN  400 Bad Request
    """
    nine_cards = [_CARD] * 9

    with patch("app.routers.auth.get_saved_cards", return_value=nine_cards), \
         patch("app.routers.auth.add_saved_card",
               side_effect=ValueError("Maximum of 10 saved cards allowed.")):

        resp = client.post("/auth/me/cards", json=CARD_PAYLOAD, headers=AUTH)

    assert resp.status_code == 400
    assert "10" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Test 8 — Concurrent card adds at count=9: only one succeeds
# ---------------------------------------------------------------------------
def test_concurrent_add_card_only_one_succeeds():
    """
    GIVEN a customer with 9 saved cards and two simultaneous POST requests
    WHEN  both threads fire at the same time
    THEN  exactly 1 returns 201 and 1 returns 400
          (the atomic transaction rejects the second request)
    """
    lock = threading.Lock()
    call_count = {"n": 0}

    def add_card_side_effect(user_id, label, last4, card_holder_name, expiry, is_default):
        with lock:
            call_count["n"] += 1
            n = call_count["n"]
        if n > 1:
            raise ValueError("Maximum of 10 saved cards allowed.")
        return _CARD

    nine_cards = [_CARD] * 9
    results = []
    results_lock = threading.Lock()

    with patch("app.routers.auth.get_saved_cards", return_value=nine_cards), \
         patch("app.routers.auth.add_saved_card", side_effect=add_card_side_effect):

        def do_add():
            resp = client.post("/auth/me/cards", json=CARD_PAYLOAD, headers=AUTH)
            with results_lock:
                results.append(resp.status_code)

        threads = [threading.Thread(target=do_add) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

    assert results.count(201) == 1, f"Expected 1 success, got: {results}"
    assert results.count(400) == 1, f"Expected 1 rejection, got: {results}"
