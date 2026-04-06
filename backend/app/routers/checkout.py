"""Checkout endpoint.

Flow:
  1. Load cart  →  validate stock for every item
  2. Mock payment confirmation (always succeeds — no real processing)
  3. Decrement stock for each item atomically
  4. Create Order document (status: "processing")
  5. Create Invoice document
  6. Create one Delivery record per order
  7. Generate PDF invoice + email to customer
  8. Clear cart
  9. Return order + invoice
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models.invoice import InvoiceCreate, InvoiceItem, InvoiceResponse
from app.models.order import CheckoutRequest, OrderResponse
from app.repositories import delivery_repository, invoice_repository, order_repository
from app.repositories.cart_repository import clear_cart, get_cart
from app.repositories.product_repository import decrement_stock, get_product_by_id
from app.repositories.user_repository import get_user_by_id
from app.services.email_service import send_invoice_email
from app.utils.pdf import generate_invoice_pdf

SHIPPING_COST = 45.00
FREE_SHIPPING_THRESHOLD = 5000.00
TAX_RATE = 0.08

router = APIRouter(prefix="/checkout", tags=["checkout"])


def _mock_payment_approved(card_last4: str, card_holder_name: str, amount: float) -> bool:
    """Mock banking entity — always approves valid-looking requests.

    A real integration would call an external payment gateway here.
    Card last4 "0000" is reserved as a test-decline trigger.
    """
    if card_last4 == "0000":
        return False
    return True


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def checkout(
    payload: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]

    # ── 1. Load cart ──────────────────────────────────────────────────────────
    cart = get_cart(user_id)
    cart_items = cart.get("items", [])
    if not cart_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty",
        )

    # ── 2. Validate stock & build order items ─────────────────────────────────
    enriched_items: list[dict] = []
    subtotal = 0.0

    for item in cart_items:
        product = get_product_by_id(item["product_id"])
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {item['product_id']} no longer exists",
            )
        if product["stock_quantity"] < item["quantity"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"'{product['name']}' has insufficient stock "
                       f"(requested {item['quantity']}, available {product['stock_quantity']})",
            )
        item_subtotal = round(product["price"] * item["quantity"], 2)
        subtotal += item_subtotal
        enriched_items.append({
            "product_id": item["product_id"],
            "product_name": product["name"],
            "quantity": item["quantity"],
            "unit_price": product["price"],
            "subtotal": item_subtotal,
        })

    subtotal = round(subtotal, 2)
    shipping = 0.0 if subtotal >= FREE_SHIPPING_THRESHOLD else SHIPPING_COST
    tax = round(subtotal * TAX_RATE, 2)
    total_amount = round(subtotal + shipping + tax, 2)

    # ── 3. Resolve customer name ──────────────────────────────────────────────
    user = get_user_by_id(user_id)
    if user:
        first = user.get("first_name", "")
        last = user.get("last_name", "")
        customer_name = f"{first} {last}".strip() or user_id
        customer_email = user.get("email", user_id)
    else:
        customer_name = user_id
        customer_email = user_id

    # ── 4. Mock payment ───────────────────────────────────────────────────────
    approved = _mock_payment_approved(
        payload.card_last4, payload.card_holder_name, total_amount
    )
    if not approved:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Payment declined by banking entity",
        )

    # ── 5. Decrement stock (atomic, per product) ──────────────────────────────
    # Roll-back list in case a later item fails stock check at the DB level
    decremented: list[tuple[str, int]] = []
    try:
        for item in enriched_items:
            decrement_stock(item["product_id"], item["quantity"])
            decremented.append((item["product_id"], item["quantity"]))
    except ValueError as exc:
        # Re-increment already-decremented items to restore consistency
        from app.repositories.product_repository import increment_purchase_count  # noqa: local import for rollback
        import firebase_admin.firestore as _fs
        from app.firebase.client import get_firebase_app
        from app.repositories.product_repository import PRODUCTS_COLLECTION, _db as _pdb, _invalidate_product, _invalidate_products
        _db = _pdb()
        for pid, qty in decremented:
            _db.collection(PRODUCTS_COLLECTION).document(pid).update(
                {"stock_quantity": _fs.Increment(qty)}
            )
            _invalidate_product(pid)
        _invalidate_products()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    # ── 6. Create Order ───────────────────────────────────────────────────────
    order_data = {
        "customer_id": user_id,
        "customer_email": customer_email,
        "customer_name": customer_name,
        "delivery_address": payload.delivery_address,
        "items": enriched_items,
        "subtotal": subtotal,
        "tax": tax,
        "shipping": shipping,
        "total_amount": total_amount,
        "invoice_id": None,
    }
    order_id = order_repository.create_order(order_data)
    order = order_repository.get_order_by_id(order_id)

    # ── 7. Create Invoice ─────────────────────────────────────────────────────
    invoice_payload = InvoiceCreate(
        customer_id=user_id,
        customer_email=customer_email,
        customer_name=customer_name,
        delivery_address=payload.delivery_address,
        items=[InvoiceItem(**i) for i in enriched_items],
        subtotal=subtotal,
        tax=tax,
        shipping=shipping,
        total_amount=total_amount,
    )
    invoice_id = invoice_repository.create_invoice(invoice_payload.model_dump())
    invoice_doc = invoice_repository.get_invoice_by_id(invoice_id)
    invoice = InvoiceResponse(**invoice_doc)

    # Link invoice back to order
    order_repository.set_invoice_id(order_id, invoice_id)
    order["invoice_id"] = invoice_id

    # ── 8. Create Delivery record ──────────────────────────────────────────────
    # One delivery record per order (multi-item orders ship together)
    total_qty = sum(i["quantity"] for i in enriched_items)
    delivery_data = {
        "customer_id": user_id,
        "order_id": order_id,
        # Use first product_id for legacy single-product field; full items on order
        "product_id": enriched_items[0]["product_id"],
        "quantity": total_qty,
        "total_price": total_amount,
        "delivery_address": payload.delivery_address,
    }
    delivery_repository.create_delivery(delivery_data)

    # ── 9. Generate PDF & send email ──────────────────────────────────────────
    try:
        pdf_bytes = generate_invoice_pdf(invoice)
        send_invoice_email(invoice, pdf_bytes)
    except RuntimeError:
        # reportlab not installed — skip silently (dev environment)
        pass

    # ── 10. Clear cart ─────────────────────────────────────────────────────────
    clear_cart(user_id)

    # ── 11. Respond ────────────────────────────────────────────────────────────
    return {
        "order": OrderResponse(**order).model_dump(),
        "invoice": invoice.model_dump(),
    }
