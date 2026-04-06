import time
from datetime import datetime, timezone
from typing import Optional

from google.cloud.firestore_v1 import FieldFilter

from app.firebase.client import get_firebase_app
import firebase_admin.firestore as firestore_module

PRODUCTS_COLLECTION = "products"
CATEGORIES_COLLECTION = "categories"

# ── Simple in-memory TTL cache ────────────────────────────────────────────────
_CACHE_TTL = 60  # seconds

_products_cache: Optional[dict] = None   # {"data": [...], "ts": float}
_product_cache: dict[str, dict] = {}     # product_id -> {"data": dict, "ts": float}
_categories_cache: Optional[dict] = None


def _products_all() -> Optional[list[dict]]:
    if _products_cache and time.time() - _products_cache["ts"] < _CACHE_TTL:
        return _products_cache["data"]
    return None


def _set_products_all(products: list[dict]) -> None:
    global _products_cache
    _products_cache = {"data": products, "ts": time.time()}


def _invalidate_products() -> None:
    global _products_cache
    _products_cache = None


def _get_product(product_id: str) -> Optional[dict]:
    entry = _product_cache.get(product_id)
    if entry and time.time() - entry["ts"] < _CACHE_TTL:
        return entry["data"]
    return None


def _set_product(product_id: str, data: dict) -> None:
    _product_cache[product_id] = {"data": data, "ts": time.time()}


def _invalidate_product(product_id: str) -> None:
    _product_cache.pop(product_id, None)


def _db():
    get_firebase_app()
    return firestore_module.client()


def create_product(data: dict) -> str:
    db = _db()
    now = datetime.now(timezone.utc).isoformat()
    data["created_at"] = now
    data["updated_at"] = now

    ref = db.collection(PRODUCTS_COLLECTION).document()
    data["id"] = ref.id
    ref.set(data)
    _invalidate_products()
    return ref.id


def get_product_by_id(product_id: str) -> Optional[dict]:
    cached = _get_product(product_id)
    if cached is not None:
        return cached
    db = _db()
    doc = db.collection(PRODUCTS_COLLECTION).document(product_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    _set_product(product_id, data)
    return data


def get_product_names_by_ids(product_ids: list[str]) -> dict[str, str]:
    """Return {product_id: name} for the given ids, using cache where possible."""
    result: dict[str, str] = {}
    uncached: list[str] = []

    for pid in product_ids:
        cached = _get_product(pid)
        if cached is not None:
            result[pid] = cached.get("name", pid)
        else:
            uncached.append(pid)

    if uncached:
        db = _db()
        refs = [db.collection(PRODUCTS_COLLECTION).document(pid) for pid in uncached]
        for doc in db.get_all(refs):
            if doc.exists:
                data = doc.to_dict()
                _set_product(doc.id, data)
                result[doc.id] = data.get("name", doc.id)

    return result


def list_products(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    sort_field: Optional[str] = None,
    sort_order: str = "asc",
    page: int = 1,
    limit: int = 20,
) -> tuple[list[dict], int]:
    """Return (products, total_count) applying optional filters.

    sort_field: 'price' | 'name' | 'newest' | 'popularity' | 'avg_rating'
    sort_order: 'asc' | 'desc'
    """
    # Use cached full product list when no category filter (avoids full collection reads)
    if not category_id:
        products = _products_all()
        if products is None:
            db = _db()
            docs = list(db.collection(PRODUCTS_COLLECTION).stream())
            products = [d.to_dict() for d in docs]
            _set_products_all(products)
            for p in products:
                _set_product(p["id"], p)
    else:
        db = _db()
        query = db.collection(PRODUCTS_COLLECTION).where(
            filter=FieldFilter("category_id", "==", category_id)
        )
        docs = list(query.stream())
        products = [d.to_dict() for d in docs]

    # Text search on name and description (Firestore lacks full-text; filter in-memory)
    if search:
        lower = search.lower()
        products = [
            p for p in products
            if lower in p.get("name", "").lower()
            or lower in p.get("description", "").lower()
        ]

    # Sorting
    reverse = sort_order == "desc"
    if sort_field == "price":
        products.sort(key=lambda p: p.get("price", 0), reverse=reverse)
    elif sort_field == "name":
        products.sort(key=lambda p: p.get("name", "").lower(), reverse=reverse)
    elif sort_field == "newest":
        products.sort(key=lambda p: p.get("created_at", ""), reverse=True)
    elif sort_field == "popularity":
        # Sort by purchase_count descending by default; reverse flips to ascending
        products.sort(key=lambda p: p.get("purchase_count", 0), reverse=not reverse)
    elif sort_field == "avg_rating":
        # avg_rating = rating_sum / rating_count — both stored on the product document.
        # No extra Firestore query needed: the product list is already in memory.
        def _avg(p: dict) -> float:
            count = p.get("rating_count") or 0
            total = p.get("rating_sum") or 0
            return total / count if count > 0 else 0.0
        products.sort(key=_avg, reverse=not reverse)

    total = len(products)

    # Pagination
    start = (page - 1) * limit
    products = products[start: start + limit]

    return products, total


def list_featured_products(limit: int = 8) -> tuple[list[dict], int]:
    """Return newest products ordered by created_at descending."""
    products = _products_all()
    if products is None:
        db = _db()
        docs = list(db.collection(PRODUCTS_COLLECTION).stream())
        products = [d.to_dict() for d in docs]
        _set_products_all(products)
        for p in products:
            _set_product(p["id"], p)
    sorted_products = sorted(products, key=lambda p: p.get("created_at", ""), reverse=True)
    return sorted_products[:limit], len(sorted_products)


def update_product(product_id: str, updates: dict) -> None:
    db = _db()
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    db.collection(PRODUCTS_COLLECTION).document(product_id).update(updates)
    _invalidate_product(product_id)
    _invalidate_products()


def delete_product(product_id: str) -> None:
    db = _db()
    db.collection(PRODUCTS_COLLECTION).document(product_id).delete()
    _invalidate_product(product_id)
    _invalidate_products()


def apply_discount(product_id: str, discount_percent: float) -> None:
    """Apply a discount percentage to a product.

    Sets original_price only on the very first discount (so it is never
    overwritten by subsequent discounts). Only price and discount_percent
    are updated on every call.
    """
    data = get_product_by_id(product_id)
    if data is None:
        raise ValueError(f"Product {product_id} not found")

    updates: dict = {"discount_percent": discount_percent}

    # Record the true base price the first time a discount is applied.
    # After that, original_price is never touched.
    if not data.get("original_price"):
        updates["original_price"] = data["price"]
        base = data["price"]
    else:
        base = data["original_price"]

    updates["price"] = round(base * (1 - discount_percent / 100), 2)
    update_product(product_id, updates)


def remove_discount(product_id: str) -> None:
    """Restore a product's price to its original_price.

    Only price and discount_percent are touched — original_price is
    left intact so it remains a permanent record of the base price.
    """
    data = get_product_by_id(product_id)
    if data is None:
        raise ValueError(f"Product {product_id} not found")

    original_price = data.get("original_price")
    if not original_price:
        return  # No discount to remove

    update_product(product_id, {
        "price": original_price,
        "discount_percent": None,
    })


def increment_purchase_count(product_id: str, quantity: int = 1) -> None:
    """Atomically increment purchase_count by the purchased quantity."""
    db = _db()
    ref = db.collection(PRODUCTS_COLLECTION).document(product_id)
    ref.update({"purchase_count": firestore_module.Increment(quantity)})
    _invalidate_product(product_id)
    _invalidate_products()


def update_product_rating_counters(product_id: str, rating: int) -> None:
    """Atomically add one approved review's rating to rating_sum and rating_count.

    Keeps avg_rating computable as rating_sum / rating_count without fetching
    any review documents — the product document already has everything needed.
    """
    db = _db()
    ref = db.collection(PRODUCTS_COLLECTION).document(product_id)
    ref.update({
        "rating_count": firestore_module.Increment(1),
        "rating_sum": firestore_module.Increment(rating),
    })
    _invalidate_product(product_id)
    _invalidate_products()


def decrement_stock(product_id: str, quantity: int) -> None:
    """Atomically decrement stock. Raises ValueError if insufficient stock."""
    db = _db()
    ref = db.collection(PRODUCTS_COLLECTION).document(product_id)

    @firestore_module.transactional
    def _txn(transaction):
        snapshot = ref.get(transaction=transaction)
        current_stock = snapshot.get("stock_quantity")
        if current_stock < quantity:
            raise ValueError("Insufficient stock")
        transaction.update(ref, {
            "stock_quantity": current_stock - quantity,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    _txn(db.transaction())
    _invalidate_product(product_id)
    _invalidate_products()


# ── Category helpers ──────────────────────────────────────────────────────────

def create_category(data: dict) -> str:
    db = _db()
    ref = db.collection(CATEGORIES_COLLECTION).document()
    data["id"] = ref.id
    ref.set(data)
    return ref.id


def list_categories() -> list[dict]:
    db = _db()
    docs = db.collection(CATEGORIES_COLLECTION).stream()
    return [d.to_dict() for d in docs]


def get_category_by_id(category_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(CATEGORIES_COLLECTION).document(category_id).get()
    if not doc.exists:
        return None
    return doc.to_dict()


def get_category_by_slug(slug: str) -> Optional[dict]:
    """Lookup a category by its slug field."""
    db = _db()
    docs = (
        db.collection(CATEGORIES_COLLECTION)
        .where(filter=FieldFilter("slug", "==", slug))
        .limit(1)
        .stream()
    )
    for doc in docs:
        return doc.to_dict()
    return None
