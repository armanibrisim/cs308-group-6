from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.firebase.client import get_firebase_app
from app.routers import auth

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


@app.get("/")
async def root():
    return {"status": "ok"}
