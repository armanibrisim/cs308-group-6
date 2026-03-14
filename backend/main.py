from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.firebase import get_firebase_app
from app.routes import auth

# Firebase'i uygulama başlarken başlat
get_firebase_app()

app = FastAPI(title="CS308 Group 6 API", version="1.0.0")

# CORS — frontend'den istek gelebilsin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # production'da frontend URL'ini yaz
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.get("/")
async def root():
    return {"status": "ok"}
