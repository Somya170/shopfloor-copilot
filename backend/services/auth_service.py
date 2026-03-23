"""
factory-ai-platform · services/auth_service.py
JWT creation / validation, password hashing, RBAC decorators.
"""
import logging
from datetime import datetime, timezone
from functools import wraps
from typing import Callable

import bcrypt
import jwt
from flask import g, jsonify, request

from config.settings import settings

logger = logging.getLogger(__name__)


# ── Password helpers ─────────────────────────────────────────

def hash_password(plain: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(plain.encode(), salt).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── JWT helpers ──────────────────────────────────────────────

def create_access_token(user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub":  str(user_id),
        "role": role,
        "iat":  now,
        "exp":  now + settings.JWT_ACCESS_EXPIRES,
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub":  str(user_id),
        "iat":  now,
        "exp":  now + settings.JWT_REFRESH_EXPIRES,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify JWT. Raises jwt.exceptions on failure."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def extract_bearer(auth_header: str | None) -> str | None:
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    return auth_header.split(" ", 1)[1].strip()


# ── Request guards ───────────────────────────────────────────

def jwt_required(f: Callable) -> Callable:
    """Decorator: require a valid access JWT on the request."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_bearer(request.headers.get("Authorization"))
        if not token:
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        try:
            payload = decode_token(token)
            if payload.get("type") != "access":
                raise ValueError("Not an access token")
            g.user_id   = int(payload["sub"])
            g.user_role = payload["role"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except (jwt.InvalidTokenError, ValueError, KeyError) as exc:
            logger.warning("JWT validation failed: %s", exc)
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated


def roles_required(*allowed_roles: str) -> Callable:
    """Decorator factory: limit endpoint to specific roles.
    Must be applied AFTER @jwt_required.
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated(*args, **kwargs):
            if g.user_role not in allowed_roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator