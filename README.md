# LUMEN — E-Commerce Platform

LUMEN is a full-stack e-commerce web application built as a group project for CS308. It supports three user roles (customer, sales manager, product manager) with separate dashboards and feature sets, backed by a REST API and Firebase Firestore.

## Team

- Ramazan Yıldırım
- Arman İbrişim
- Berkan Çetin
- Furkan Çetin
- Semih Kas
- Sinan Nalbur

---

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend   | Python 3.11+, FastAPI, Uvicorn          |
| Database  | Firebase Firestore                      |
| Auth      | JWT (python-jose) + bcrypt              |
| PDF       | ReportLab (invoice generation)          |

---

## Features

### Customer
- Browse and search products by category
- Product detail pages with reviews and ratings
- Shopping cart and checkout with address and payment info
- Promo code support at checkout
- Order history with delivery status tracking
- Return requests (within 30 days of delivery)
- Wishlist — get notified when a wishlisted product goes on sale
- Notifications (server + local) for purchases, returns, and discount alerts

### Sales Manager
- Apply / remove percentage discounts on products (wishlist users are notified automatically)
- Set product prices directly
- Create and manage promo codes
- View and approve / reject return requests
- Revenue analytics dashboard with charts
- Download PDF invoices filtered by date range

### Product Manager
- Add, edit, and delete products
- Manage product categories
- Update stock quantities

### Admin
- View and manage all user accounts

---

## Project Structure

```
cs308-group-6/
├── backend/          # FastAPI application
│   ├── app/
│   │   ├── routers/      # Route handlers (products, orders, cart, …)
│   │   ├── services/     # Business logic
│   │   ├── repositories/ # Firestore data access
│   │   ├── models/       # Pydantic schemas
│   │   └── firebase/     # Firebase client initialisation
│   ├── tests/            # pytest test suite
│   ├── requirements.txt
│   └── .env.example
└── frontend/         # Next.js application
    └── src/
        ├── app/          # Next.js App Router pages (customer / sales / product-manager / admin)
        ├── components/   # Shared UI components
        ├── services/     # API client functions
        ├── context/      # Auth, category, wishlist contexts
        └── types/        # TypeScript type definitions
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- A Firebase project with **Firestore** enabled and a service account JSON key

---

## Running the Project

### 1. Clone the repository

```bash
git clone https://github.com/armanibrisim/cs308-group-6.git
cd cs308-group-6
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Edit `.env`:

```
FIREBASE_CREDENTIALS_PATH=firebase_credentials.json
SECRET_KEY=your-strong-random-secret-key
```

Place your Firebase service account file at `backend/firebase_credentials.json`.

```bash
# Start the API server
uvicorn app.main:app --reload
```

API available at: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

### 3. Frontend setup

```bash
cd frontend

npm install

# Configure environment variables
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

```bash
npm run dev
```

App available at: `http://localhost:3000`

### 4. Run both together

Open two terminals:

```bash
# Terminal 1 — Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2 — Frontend
cd frontend && npm run dev
```

---

## User Roles

All new accounts register as **customer** by default. To grant manager or admin access, manually set the `role` field on the user's Firestore document.

| Role               | Landing page            |
|--------------------|-------------------------|
| `customer`         | `/browse`               |
| `sales_manager`    | `/sales-dashboard`      |
| `product_manager`  | `/products-dashboard`   |
| `admin`            | `/admin-dashboard`      |

---

## Running Tests

```bash
cd backend
source venv/bin/activate
pytest
```

---

## Seeding Data

The repo includes helper scripts to populate Firestore with sample data:

```bash
cd backend
python seed_products.py          # Import scraped tech products
python seed_ratings.py           # Add sample ratings
python seed_purchase_counts.py   # Add sample purchase counts
```
