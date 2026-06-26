"""Password hashing (bcrypt) and JWT tokens for HR / admin login."""
from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Optional

import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET", "recruto-dev-change-in-production")
JWT_ALG = "HS256"
ACCESS_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "7"))


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    if not plain or not hashed:
        return False
    return pwd_context.verify(plain, hashed)


def create_access_token(email: str, user_id: int, role: str, full_name: Optional[str] = None) -> str:
    payload = {
        "sub": email,
        "uid": user_id,
        "role": role,
        "name": full_name or "",
        "exp": datetime.utcnow() + timedelta(days=ACCESS_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        return None
