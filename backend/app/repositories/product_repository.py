from datetime import datetime, timezone
from typing import Optional

from google.cloud.firestore_v1 import FieldFilter

from app.firebase.client import get_firebase_app
import firebase_admin.firestore as firestore_module

PRODUCTS_COLLECTION = "products"
CATEGORIES_COLLECTION = "categories"


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
    return ref.id


def get_product_by_id(product_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(PRODUCTS_COLLECTION).document(product_id).get()
    if not doc.exists:
        return None
    return doc.to_dict()


def list_products(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[dict], int]:
    """Return (products, total_count) applying optional filters."""
    db = _db()
    query = db.collection(PRODUCTS_COLLECTION)

    if category_id:
        query = query.where(filter=FieldFilter("category_id", "==", category_id))

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
    if sort_by == "price_asc":
        products.sort(key=lambda p: p.get("price", 0))
    elif sort_by == "price_desc":
        products.sort(key=lambda p: p.get("price", 0), reverse=True)
    elif sort_by == "name_asc":
        products.sort(key=lambda p: p.get("name", "").lower())

    total = len(products)

    # Pagination
    start = (page - 1) * limit
    products = products[start: start + limit]

    return products, total


def update_product(product_id: str, updates: dict) -> None:
    db = _db()
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    db.collection(PRODUCTS_COLLECTION).document(product_id).update(updates)


def delete_product(product_id: str) -> None:
    db = _db()
    db.collection(PRODUCTS_COLLECTION).document(product_id).delete()


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
