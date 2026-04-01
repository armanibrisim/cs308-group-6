from collections import defaultdict
from typing import Optional

from app.models.invoice import InvoiceResponse
from app.repositories.invoice_repository import list_invoices, list_invoices_by_date_range


# Assumed cost ratio — 70 % of subtotal (30 % gross margin estimate).
# Replace with real cost data if added to the product model.
COST_RATIO = 0.70


def _build_analytics(invoices: list[dict]) -> dict:
    """Compute revenue / profit totals and a daily time-series from a list of invoice dicts."""
    total_revenue = 0.0
    total_cost = 0.0
    daily: dict[str, dict] = defaultdict(lambda: {"revenue": 0.0, "cost": 0.0})

    for inv in invoices:
        revenue = inv.get("total_amount", 0.0)
        cost = inv.get("subtotal", 0.0) * COST_RATIO

        total_revenue += revenue
        total_cost += cost

        # Group by calendar date (first 10 chars of ISO-8601 string)
        date_key = inv.get("created_at", "")[:10]
        if date_key:
            daily[date_key]["revenue"] += revenue
            daily[date_key]["cost"] += cost

    total_profit = total_revenue - total_cost

    chart_data = sorted(
        [
            {
                "date": date,
                "revenue": round(v["revenue"], 2),
                "profit": round(v["revenue"] - v["cost"], 2),
            }
            for date, v in daily.items()
        ],
        key=lambda x: x["date"],
    )

    return {
        "total_revenue": round(total_revenue, 2),
        "total_cost": round(total_cost, 2),
        "total_profit": round(total_profit, 2),
        "invoice_count": len(invoices),
        "chart_data": chart_data,
    }


def get_analytics(start_date: Optional[str] = None, end_date: Optional[str] = None) -> dict:
    """Return revenue/profit analytics, optionally filtered to a date range."""
    if start_date and end_date:
        invoices = list_invoices_by_date_range(start_date, end_date)
    else:
        invoices = list_invoices()

    return _build_analytics(invoices)


def get_invoices_in_range(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> list[InvoiceResponse]:
    if start_date and end_date:
        invoices = list_invoices_by_date_range(start_date, end_date)
    else:
        invoices = list_invoices()

    return [InvoiceResponse(**inv) for inv in invoices]
