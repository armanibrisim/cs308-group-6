from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str


class AuthResponse(BaseModel):
    success: bool
    doc_id: str
    email: str
    role: str
    token: str
    first_name: str = ""
    last_name: str = ""
