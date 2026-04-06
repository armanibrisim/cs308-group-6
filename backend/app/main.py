from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.firebase.client import get_firebase_app
from app.routers import auth
from app.routers.cart import router as cart_router
from app.routers.checkout import router as checkout_router
from app.routers.deliveries import router as deliveries_router
from app.routers.invoices import router as invoices_router
from app.routers.orders import router as orders_router
from app.routers.products import categories_router, router as products_router
from app.routers.reviews import router as reviews_router
from app.routers.sales import router as sales_router

get_firebase_app()

app = FastAPI(title="LUMEN API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products_router)
app.include_router(categories_router)
app.include_router(cart_router)
app.include_router(checkout_router)
app.include_router(orders_router)
app.include_router(reviews_router)
app.include_router(deliveries_router)
app.include_router(invoices_router)
app.include_router(sales_router)


@app.get("/")
async def root():
    return {"status": "ok"}
