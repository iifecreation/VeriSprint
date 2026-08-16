"""
Password hashing and JWT issuance/verification. Pure logic — no FastAPI or DB
imports here; see app/auth/dependencies.py for the request-scoped wiring.

Token design (spec Section 6):
  - Access tokens are short-lived (default 15 min) and carry `workspace_id` +
    `role` directly, so every request can be authorized without a DB round
    trip for the common case.
  - Refresh tokens are long-lived (default 30 days), opaque beyond their type,
    and are re-checked against `User.token_version` on every use — bumping
    that column (password change, role change, admin-forced logout)
    invalidates every outstanding refresh token instantly without a
    denylist table.
"""
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import bcrypt
import jwt

from app.config import get_settings

settings = get_settings()

TokenType = Literal["access", "refresh"]


class TokenError(Exception):
    """Raised for any invalid/expired/malformed/wrong-type token. Callers (FastAPI
    dependencies) catch this once and turn it into a 401 — never a 500."""


def _prehash(password: str) -> bytes:
    # bcrypt silently truncates input at 72 bytes, which would make any two
    # long passwords sharing a 72-byte prefix collide. Pre-hashing with SHA-256
    # first (a fixed 32-byte digest, hex-encoded to stay within bcrypt's ASCII
    # expectations) is the standard mitigation and preserves full password entropy.
    return hashlib.sha256(password.encode("utf-8")).hexdigest().encode("ascii")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prehash(password), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_prehash(password), password_hash.encode("ascii"))
    except (ValueError, TypeError):
        # Malformed/foreign hash format — never let this look like a match.
        return False


def _encode(claims: dict[str, Any]) -> str:
    return jwt.encode(claims, settings.jwt_secret, algorithm="HS256")


def create_access_token(*, user_id: uuid.UUID, workspace_id: uuid.UUID | None, role: str, token_version: int) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user_id),
        "workspace_id": str(workspace_id) if workspace_id else None,
        "role": role,
        "tv": token_version,
        "type": "access",
        "iss": settings.jwt_issuer,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_access_ttl_minutes),
    }
    return _encode(claims)


def create_refresh_token(*, user_id: uuid.UUID, token_version: int) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user_id),
        "tv": token_version,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "iss": settings.jwt_issuer,
        "iat": now,
        "exp": now + timedelta(days=settings.jwt_refresh_ttl_days),
    }
    return _encode(claims)


def create_token_pair(*, user_id: uuid.UUID, workspace_id: uuid.UUID | None, role: str, token_version: int) -> dict[str, Any]:
    return {
        "access_token": create_access_token(user_id=user_id, workspace_id=workspace_id, role=role, token_version=token_version),
        "refresh_token": create_refresh_token(user_id=user_id, token_version=token_version),
        "token_type": "bearer",
        "expires_in": settings.jwt_access_ttl_minutes * 60,
    }


def decode_token(token: str, *, expected_type: TokenType) -> dict[str, Any]:
    try:
        claims = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], issuer=settings.jwt_issuer)
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError("Invalid token") from exc

    if claims.get("type") != expected_type:
        raise TokenError(f"Expected a {expected_type} token")
    return claims


ActionPurpose = Literal["invite", "password_reset"]

_ACTION_TTL = {"invite": timedelta(days=7), "password_reset": timedelta(hours=1)}


def create_action_token(*, user_id: uuid.UUID, purpose: ActionPurpose, token_version: int) -> str:
    """A one-shot, emailed link token (invite / password reset) — not an access
    token, so it's never accepted by `get_current_user`. Embeds `token_version`
    so it's naturally invalidated the moment it's used (set-password bumps
    token_version) or the account is otherwise revoked in the meantime."""
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user_id),
        "tv": token_version,
        "type": "action",
        "purpose": purpose,
        "iss": settings.jwt_issuer,
        "iat": now,
        "exp": now + _ACTION_TTL[purpose],
    }
    return _encode(claims)


def decode_action_token(token: str, *, expected_purpose: ActionPurpose) -> dict[str, Any]:
    try:
        claims = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], issuer=settings.jwt_issuer)
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("This link has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError("Invalid link") from exc

    if claims.get("type") != "action" or claims.get("purpose") != expected_purpose:
        raise TokenError("Invalid link")
    return claims
