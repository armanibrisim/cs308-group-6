"""Email service — sends invoice PDF to the customer via SMTP.

Required environment variables:
  SMTP_HOST     — SMTP server hostname (e.g. smtp.gmail.com)
  SMTP_PORT     — SMTP port (default: 587)
  SMTP_USER     — SMTP login username / sender address
  SMTP_PASSWORD — SMTP login password or app password
  SMTP_FROM     — Optional display From address (falls back to SMTP_USER)
"""

import logging
import os
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.invoice import InvoiceResponse

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)


def _smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def send_invoice_email(invoice: "InvoiceResponse", pdf_bytes: bytes) -> None:
    """Send the invoice PDF to the customer's email address.

    If SMTP is not configured (dev/test environment), logs a warning and returns
    silently so the checkout flow is never blocked by email delivery failures.
    """
    if not _smtp_configured():
        logger.warning(
            "SMTP not configured — skipping invoice email for invoice %s", invoice.id
        )
        return

    msg = MIMEMultipart("mixed")
    msg["From"] = SMTP_FROM
    msg["To"] = invoice.customer_email
    msg["Subject"] = f"LUMEN — Your Invoice #{invoice.id}"

    # Plain-text body
    body = (
        f"Dear {invoice.customer_name},\n\n"
        f"Thank you for your order at LUMEN!\n\n"
        f"Please find your invoice attached (Invoice #{invoice.id}).\n\n"
        f"Order summary:\n"
    )
    for item in invoice.items:
        body += f"  - {item.product_name} x{item.quantity}  ${item.subtotal:.2f}\n"
    body += (
        f"\nSubtotal:  ${invoice.subtotal:.2f}\n"
        f"Tax:       ${invoice.tax:.2f}\n"
        f"Shipping:  {'FREE' if invoice.shipping == 0 else f'${invoice.shipping:.2f}'}\n"
        f"Total:     ${invoice.total_amount:.2f}\n\n"
        f"Delivery to: {invoice.delivery_address}\n"
        + (f"Tax ID: {invoice.customer_tax_id}\n" if invoice.customer_tax_id else "")
        + f"\nFor support, contact support@lumen-store.com\n\n"
        f"— The LUMEN Team"
    )
    msg.attach(MIMEText(body, "plain"))

    # PDF attachment
    attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    attachment.add_header(
        "Content-Disposition",
        "attachment",
        filename=f"LUMEN_Invoice_{invoice.id}.pdf",
    )
    msg.attach(attachment)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, invoice.customer_email, msg.as_string())
        logger.info("Invoice email sent to %s for invoice %s", invoice.customer_email, invoice.id)
    except Exception:
        # Email failure must never abort the checkout — log and continue
        logger.exception(
            "Failed to send invoice email to %s for invoice %s",
            invoice.customer_email,
            invoice.id,
        )
