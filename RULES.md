# LUMEN — Online Tech Store (CS 308 Group 6)

## Project Overview

**LUMEN** is a full-stack e-commerce platform specializing in consumer electronics and technology
products. The store sells items across categories such as smartphones, laptops, desktop computers,
tablets, headphones, earbuds, smart watches, cameras, gaming peripherals, and accessories.

Built for Sabanci University CS 308 Software Engineering course, the system supports three user roles
(Customer, Sales Manager, Product Manager) and covers the full shopping lifecycle: browsing, cart,
checkout, order tracking, returns, and managerial dashboards.

### Brand Identity

- **Store name:** LUMEN
- **Domain / niche:** Consumer electronics & technology
- **Product categories (at minimum):**
  - Smartphones & Tablets
  - Laptops & Computers
  - Headphones & Earbuds
  - Smart Watches & Wearables
  - Cameras & Photography
  - Gaming & Peripherals
  - Accessories & Cables

---

## Tech Stack

| Layer    | Technology             |
|----------|------------------------|
| Frontend | Next.js (React)        |
| Backend  | FastAPI (Python)       |
| Database | Firebase (Firestore)   |

---

## Repository Structure

```
cs308-group-6/
├── frontend/          # Next.js application
├── backend/           # FastAPI application
├── RULES.md          # This file
└── README.md
```

### Frontend Structure (`frontend/`)

```
frontend/
├── public/                    # Static assets (images, icons, fonts)
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── (auth)/            # Login, register pages
│   │   ├── (customer)/        # Customer-facing pages (browse, cart, orders)
│   │   ├── (sales-manager)/   # Sales manager dashboard pages
│   │   ├── (product-manager)/ # Product manager dashboard pages
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # Generic UI primitives (Button, Input, Modal, etc.)
│   │   ├── product/           # Product-specific components (ProductCard, ProductList, etc.)
│   │   ├── cart/              # Cart components
│   │   ├── order/             # Order status, history components
│   │   └── layout/            # Header, Footer, Navbar, Sidebar
│   ├── hooks/                 # Custom React hooks (one hook per file)
│   ├── context/               # React context providers (one context per file)
│   ├── services/              # API call functions (one file per resource/domain)
│   ├── types/                 # TypeScript type/interface definitions (one file per domain)
│   ├── utils/                 # Pure helper functions
│   └── constants/             # App-wide constants (routes, config values)
├── .env.local                 # Environment variables (never commit)
├── next.config.ts
├── tsconfig.json
└── package.json
```

### Backend Structure (`backend/`)

```
backend/
├── app/
│   ├── main.py                # FastAPI app entry point
│   ├── config.py              # App configuration and env loading
│   ├── dependencies.py        # Shared FastAPI dependencies (auth, db)
│   ├── routers/               # One router file per resource
│   │   ├── auth.py
│   │   ├── products.py
│   │   ├── categories.py
│   │   ├── orders.py
│   │   ├── cart.py
│   │   ├── reviews.py
│   │   ├── users.py
│   │   ├── invoices.py
│   │   ├── deliveries.py
│   │   ├── discounts.py
│   │   └── refunds.py
│   ├── models/                # Pydantic request/response models (one file per domain)
│   │   ├── product.py
│   │   ├── order.py
│   │   ├── user.py
│   │   ├── review.py
│   │   ├── invoice.py
│   │   ├── delivery.py
│   │   └── refund.py
│   ├── services/              # Business logic layer (one file per domain)
│   │   ├── product_service.py
│   │   ├── order_service.py
│   │   ├── user_service.py
│   │   ├── review_service.py
│   │   ├── invoice_service.py
│   │   ├── delivery_service.py
│   │   ├── discount_service.py
│   │   ├── refund_service.py
│   │   └── email_service.py
│   ├── repositories/          # Firebase/Firestore data access layer (one file per collection)
│   │   ├── product_repository.py
│   │   ├── order_repository.py
│   │   ├── user_repository.py
│   │   ├── review_repository.py
│   │   ├── invoice_repository.py
│   │   └── delivery_repository.py
│   ├── firebase/
│   │   └── client.py          # Firebase Admin SDK initialization
│   └── utils/
│       ├── auth.py            # Authentication helpers
│       ├── encryption.py      # Password hashing, sensitive data encryption
│       └── pdf.py             # PDF generation for invoices
├── tests/                     # Unit and integration tests
│   ├── test_products.py
│   ├── test_orders.py
│   └── ...
├── .env                       # Environment variables (never commit)
├── requirements.txt
└── pyproject.toml
```

---

## Coding Rules

### General

- **One class / one responsibility per file.** Do not put multiple unrelated classes or routers in a
  single file. If a file grows too large, split it.
- **Descriptive names.** File names, function names, and variable names must clearly reflect their
  purpose. Avoid abbreviations unless universally understood (e.g., `id`, `url`).
- **No magic numbers or strings.** Move constants to `constants/` (frontend) or a dedicated
  `constants.py` / `config.py` (backend).
- **Comment non-obvious logic.** Add a short comment above any block of code whose intent is not
  immediately clear. Do not comment self-explanatory lines.
- **Keep functions small.** A function should do one thing. If it does more, split it.
- **Environment variables only.** Secrets, API keys, Firebase credentials, and base URLs must never
  be hardcoded. Always load from `.env` / `.env.local`.

### Frontend (Next.js)

- Use the **App Router** (`src/app/`). Do not mix Pages Router patterns.
- Every page component lives in its own folder under `src/app/`.
- Every reusable component lives in `src/components/` in the appropriate subfolder.
- **One component per file.** A file should export exactly one primary component.
- Use **TypeScript** throughout. Define all data types in `src/types/`. Do not use `any`.
- API calls must go through `src/services/` — never call `fetch`/`axios` directly inside a
  component or page.
- Use custom hooks in `src/hooks/` for any stateful logic shared across components.
- Keep pages thin: pages should compose components and call hooks/services, not contain business
  logic themselves.

### Backend (FastAPI)

- Follow the **router → service → repository** layering strictly:
  - **Router** (`routers/`): handles HTTP, validates input via Pydantic, calls service.
  - **Service** (`services/`): contains all business logic, calls repository.
  - **Repository** (`repositories/`): handles all Firestore read/write operations.
- Define all request and response shapes as **Pydantic models** in `models/`.
- Use **dependency injection** (`Depends`) for auth checks, database clients, and shared state.
- Never perform Firestore queries directly inside a router or service — always go through the
  repository layer.
- Passwords must be hashed. Never store plain-text passwords.
- Sensitive fields (credit card info, passwords) must be encrypted at rest.

### Database (Firebase / Firestore)

- Collections should be named in **plural snake_case** (e.g., `products`, `order_items`,
  `delivery_lists`).
- Each Firestore document should have an explicit `id` field matching its document ID.
- Never expose raw Firestore document references or internal IDs to the frontend directly — map
  them through Pydantic response models.

---

## Git Rules

- Branch naming: `feature/<short-description>`, `fix/<short-description>`, `chore/<short-description>`
- Commit messages: short imperative sentence, e.g. `Add product search endpoint`
- Do not commit `.env`, `.env.local`, or any Firebase service account JSON files.
- Open a Pull Request for every feature; get at least one review before merging to `main`.

---

## Testing

- Write at least **25 new unit tests per demo** (grading requirement).
- Backend tests live in `backend/tests/`. Use `pytest`.
- Frontend tests live alongside components as `ComponentName.test.tsx`. Use Jest + React Testing
  Library.
- Test file naming: `test_<module>.py` (backend), `<Component>.test.tsx` (frontend).
- Each test should test one behavior. Do not write monolithic tests.

---

## Project Management

- Maintain at least **15 product backlog items** and **30 sprint backlog items** per demo.
- Log at least **5 bug reports** per demo.
- Attend all SCRUM meetings (Sprint Planning, Review, Retrospective).
- Sprints are 2 weeks long. Sprint 1 started **March 13, 2026**.

### Progress Demo Requirements (due ~May 1, 2026)

Features 1, 3, 4, 5, 7, and 9 must be fully working:
- Product browsing with categories
- Stock management + order status tracking
- Guest cart + login to checkout + mock banking entity payment + invoice email (PDF)
- Comments & ratings (1-5 stars or 1-10 points) with manager approval
- Search + sort (price/popularity) + out-of-stock handling
- Product fields: ID, name, model, serial number, description, stock qty, price, warranty, distributor
- Customer properties: ID, name, tax ID, e-mail address, home address, password (minimum required)
- Delivery list properties: delivery ID, customer ID, product ID, quantity, total price, delivery address, completion status

### Final Demo Requirements (TBA)

All 17 features must be complete.

---

---

## Detailed Requirements

### User Roles & Properties

**Customer Properties (minimum required):**
- ID, name, tax ID, e-mail address, home address, password

**User Roles:**
- Customers: view, search, comment, rate, wishlist, order, cancel, return products
- Sales Managers: set prices, manage discounts, view invoices, calculate revenue/profit
- Product Managers: add/remove products/categories, manage stock, handle deliveries, approve comments

### System Specifications

**Rating System:**
- Products can be rated with 1-5 stars OR 1-10 points
- Comments require product manager approval before becoming visible

**Payment Processing:**
- Mock banking entity for payment confirmation (no real payment processing)
- Credit card verification and limits are out of scope

**Delivery Management:**
- Delivery list properties: delivery ID, customer ID, product ID, quantity, total price, delivery address, completion status
- Product managers handle delivery department responsibilities

---

## Security Requirements

As per course requirements, sensitive information must be kept encrypted:
- User passwords must be hashed
- Credit card information must be encrypted at rest
- Invoice data must be secured
- User account information must be protected
