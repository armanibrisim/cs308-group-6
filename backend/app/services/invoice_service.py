from fastapi import HTTPException, status

from app.models.invoice import InvoiceCreate, InvoiceResponse
from app.repositories import invoice_repository


def create_invoice(payload: InvoiceCreate) -> InvoiceResponse:
    data = payload.model_dump()
    invoice_id = invoice_repository.create_invoice(data)
    invoice = invoice_repository.get_invoice_by_id(invoice_id)
    return InvoiceResponse(**invoice)


def fetch_invoices() -> list[InvoiceResponse]:
    invoices = invoice_repository.list_invoices()
    return [InvoiceResponse(**inv) for inv in invoices]


def fetch_invoice(invoice_id: str) -> InvoiceResponse:
    invoice = invoice_repository.get_invoice_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return InvoiceResponse(**invoice)
