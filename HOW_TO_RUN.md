# How to Run LUMEN

## Prerequisites

- Python 3.11+
- Node.js 18+
- Firebase project set up (Firestore enabled)

---

## Backend (FastAPI)

### 1. Navigate to the backend folder

```bash
cd backend
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```
FIREBASE_CREDENTIALS_PATH=firebase_credentials.json
SECRET_KEY=your-strong-random-secret-key
```

> Make sure `firebase_credentials.json` is present in the `backend/` folder.

### 5. Run the server

```bash
uvicorn app.main:app --reload
```

The API will be available at **[http://localhost:8000](http://localhost:8000)**
Interactive docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

## Frontend (Next.js)

### 1. Navigate to the frontend folder

```bash
cd frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### 4. Run the development server

```bash
npm run dev
```

The app will be available at **[http://localhost:3000](http://localhost:3000)**

---

## Running Both Together

Open two terminal tabs and run each server in its own tab:

**Terminal 1 — Backend:**

```bash
cd backend && source venv/bin/activate && uvicorn app.main:app --reload
```

**Terminal 2 — Frontend:**

```bash
cd frontend && npm run dev
```

---

## User Roles

After registering, accounts default to the **customer** role.
To create `sales_manager` or `product_manager` accounts, manually update the `role` field in Firestore for that user's document.


| Role              | Redirects to          |
| ----------------- | --------------------- |
| `customer`        | `/browse`             |
| `sales_manager`   | `/sales-dashboard`    |
| `product_manager` | `/products-dashboard` |


