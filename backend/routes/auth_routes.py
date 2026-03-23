"""
factory-ai-platform · routes/auth_routes.py
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/refresh
GET  /api/auth/me
POST /api/auth/logout
"""
import logging
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from database.db import execute_one, execute_write
from database.cache import cache_set, cache_get, cache_delete
from services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    jwt_required,
    extract_bearer,
)

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

ALLOWED_SIGNUP_ROLES = {"tech_staff", "non_tech_staff"}

# ── Validators ───────────────────────────────────────────────

def _validate_signup(data: dict) -> str | None:
    for field in ("name", "email", "password", "role"):
        if not data.get(field, "").strip():
            return f"Field '{field}' is required"
    if data["role"] not in ALLOWED_SIGNUP_ROLES:
        return f"Role must be one of: {', '.join(ALLOWED_SIGNUP_ROLES)}"
    if len(data["password"]) < 8:
        return "Password must be at least 8 characters"
    if "@" not in data["email"]:
        return "Invalid email address"
    return None


# ── Routes ───────────────────────────────────────────────────

@auth_bp.route("/signup", methods=["POST"])
def signup():
    """Register a new Tech or Non-Tech user."""
    data = request.get_json(silent=True) or {}

    err = _validate_signup(data)
    if err:
        return jsonify({"error": err}), 400

    email    = data["email"].strip().lower()
    name     = data["name"].strip()
    role     = data["role"].strip()
    password = data["password"]

    # check duplicate
    existing = execute_one("SELECT id FROM users WHERE email = %s", (email,))
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    pwd_hash = hash_password(password)
    user = execute_write(
        """
        INSERT INTO users (name, email, password_hash, role)
        VALUES (%s, %s, %s, %s)
        RETURNING id, name, email, role, created_at
        """,
        (name, email, pwd_hash, role),
    )
    if not user:
        return jsonify({"error": "Registration failed"}), 500

    access_token  = create_access_token(user["id"], user["role"])
    refresh_token = create_refresh_token(user["id"])

    # cache refresh token (TTL = 30 days in seconds)
    cache_set(f"refresh:{user['id']}", refresh_token, ttl=60 * 60 * 24 * 30)

    logger.info("New user registered: %s (%s)", email, role)
    return jsonify({
        "message":       "Registration successful",
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "user": {
            "id":         user["id"],
            "name":       user["name"],
            "email":      user["email"],
            "role":       user["role"],
            "created_at": str(user["created_at"]),
        },
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate with email + password, receive JWT pair."""
    data = request.get_json(silent=True) or {}
    email    = (data.get("email", "") or "").strip().lower()
    password = data.get("password", "") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = execute_one(
        "SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = %s",
        (email,),
    )
    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user["is_active"]:
        return jsonify({"error": "Account is deactivated"}), 403

    # update last_login
    execute_write(
        "UPDATE users SET last_login = NOW() WHERE id = %s",
        (user["id"],),
    )

    access_token  = create_access_token(user["id"], user["role"])
    refresh_token = create_refresh_token(user["id"])
    cache_set(f"refresh:{user['id']}", refresh_token, ttl=60 * 60 * 24 * 30)

    logger.info("User logged in: %s", email)
    return jsonify({
        "message":       "Login successful",
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "user": {
            "id":    user["id"],
            "name":  user["name"],
            "email": user["email"],
            "role":  user["role"],
        },
    }), 200


@auth_bp.route("/refresh", methods=["POST"])
def refresh():
    """Exchange a valid refresh token for a new access token."""
    data = request.get_json(silent=True) or {}
    token = data.get("refresh_token", "")
    if not token:
        return jsonify({"error": "Refresh token required"}), 400

    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        user_id = int(payload["sub"])
    except Exception as exc:
        return jsonify({"error": "Invalid or expired refresh token"}), 401

    # verify token matches cached value
    cached = cache_get(f"refresh:{user_id}")
    if cached != token:
        return jsonify({"error": "Refresh token revoked"}), 401

    user = execute_one("SELECT id, role FROM users WHERE id = %s AND is_active = TRUE", (user_id,))
    if not user:
        return jsonify({"error": "User not found"}), 404

    new_access = create_access_token(user["id"], user["role"])
    return jsonify({"access_token": new_access}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required
def me():
    """Return the currently authenticated user's profile."""
    user = execute_one(
        "SELECT id, name, email, role, created_at, last_login FROM users WHERE id = %s",
        (g.user_id,),
    )
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id":         user["id"],
        "name":       user["name"],
        "email":      user["email"],
        "role":       user["role"],
        "created_at": str(user["created_at"]),
        "last_login": str(user["last_login"]) if user["last_login"] else None,
    }), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required
def logout():
    """Revoke refresh token (client should discard access token)."""
    cache_delete(f"refresh:{g.user_id}")
    return jsonify({"message": "Logged out successfully"}), 200