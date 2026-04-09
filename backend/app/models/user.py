from typing import Optional

from pydantic import BaseModel, Field


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


class AddressCreate(BaseModel):
    label: str = Field(min_length=1, max_length=50)       # e.g. "Home", "Work"
    full_address: str = Field(min_length=5, max_length=300)
    is_default: bool = False


class AddressResponse(BaseModel):
    id: str
    label: str
    full_address: str
    is_default: bool
