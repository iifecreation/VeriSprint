"""
Generic OIDC SSO (spec Section 5.11, Enterprise tier; Phase 3 competitor-
parity extends this to be per-workspace): a real, standards-compliant
Authorization Code + PKCE flow against whatever IdP the customer configures
(Okta, Azure AD, Google Workspace, OneLogin, ...).

Two config sources, resolved by `resolve_oidc_config`:
  - A `WorkspaceSSOConfig` row (Phase 3) — a shared/multi-tenant deployment
    can give each Enterprise workspace its own IdP.
  - The process-global OIDC_ISSUER/OIDC_CLIENT_ID/OIDC_CLIENT_SECRET/
    OIDC_REDIRECT_URL env vars — the fallback, and the only option for a
    single-tenant/self-hosted deployment.

This is genuinely functional code, not a stub — but it has never run against
a real customer IdP, only been reviewed for correctness against the OIDC
spec. Activating it for a given customer means pointing one of the above at
their IdP and registering the redirect URL as an allowed callback there.
"""
import base64
import hashlib
import secrets
from dataclasses import dataclass
from functools import lru_cache
from uuid import UUID

import httpx
import jwt
from jwt import PyJWKClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import Workspace, WorkspaceSSOConfig

settings = get_settings()


class OIDCNotConfigured(RuntimeError):
    pass


@dataclass(frozen=True)
class OIDCConfig:
    issuer: str
    client_id: str
    client_secret: str
    redirect_url: str
    workspace_id: UUID | None  # None for the global/fallback config


async def resolve_oidc_config(db: AsyncSession, *, workspace_account_login: str | None) -> OIDCConfig:
    """`workspace_account_login` is the GitHub org/account login used as the
    workspace's public identifier in the SSO login URL (e.g.
    `/auth/sso/login?workspace=acme-corp`) — never the internal UUID, so the
    login link stays human-readable and stable across environments."""
    if workspace_account_login:
        result = await db.execute(select(Workspace).where(Workspace.account_login == workspace_account_login))
        workspace = result.scalar_one_or_none()
        if workspace is not None:
            config_result = await db.execute(select(WorkspaceSSOConfig).where(WorkspaceSSOConfig.workspace_id == workspace.id))
            config = config_result.scalar_one_or_none()
            if config is not None and config.enabled:
                return OIDCConfig(
                    issuer=config.issuer, client_id=config.client_id, client_secret=config.client_secret,
                    redirect_url=f"{settings.api_base_url}/auth/sso/callback", workspace_id=workspace.id,
                )

    if not (settings.oidc_issuer and settings.oidc_client_id and settings.oidc_client_secret and settings.oidc_redirect_url):
        raise OIDCNotConfigured(
            "SSO is not configured for this workspace, and no global fallback is set "
            "(OIDC_ISSUER/OIDC_CLIENT_ID/OIDC_CLIENT_SECRET/OIDC_REDIRECT_URL)"
        )
    return OIDCConfig(
        issuer=settings.oidc_issuer, client_id=settings.oidc_client_id, client_secret=settings.oidc_client_secret,
        redirect_url=settings.oidc_redirect_url, workspace_id=None,
    )


@lru_cache
def _discover(issuer: str) -> dict:
    """Fetch and cache the IdP's OIDC discovery document, keyed by issuer so
    multiple per-workspace IdPs don't collide in the cache."""
    resp = httpx.get(f"{issuer.rstrip('/')}/.well-known/openid-configuration", timeout=10)
    resp.raise_for_status()
    return resp.json()


def generate_pkce_pair() -> tuple[str, str]:
    """Returns (code_verifier, code_challenge) per RFC 7636."""
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(40)).rstrip(b"=").decode()
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return verifier, challenge


def build_authorize_url(config: OIDCConfig, state: str, code_challenge: str) -> str:
    doc = _discover(config.issuer)
    params = {
        "response_type": "code",
        "client_id": config.client_id,
        "redirect_uri": config.redirect_url,
        "scope": "openid email profile",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    query = str(httpx.QueryParams(params))
    return f"{doc['authorization_endpoint']}?{query}"


def exchange_code_for_claims(config: OIDCConfig, code: str, code_verifier: str) -> dict:
    """Exchange an authorization code for tokens, verify the id_token, and return its claims."""
    doc = _discover(config.issuer)
    resp = httpx.post(
        doc["token_endpoint"],
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": config.redirect_url,
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "code_verifier": code_verifier,
        },
        timeout=15,
    )
    resp.raise_for_status()
    id_token = resp.json()["id_token"]

    jwk_client = PyJWKClient(doc["jwks_uri"])
    signing_key = jwk_client.get_signing_key_from_jwt(id_token)
    claims = jwt.decode(
        id_token,
        signing_key.key,
        algorithms=["RS256"],
        audience=config.client_id,
        issuer=doc["issuer"],
    )
    return claims


def sign_state(state: str, code_verifier: str, workspace_account_login: str | None) -> str:
    """
    Pack (state, code_verifier, workspace) into a short-lived signed JWT
    stored client-side (a cookie) between /login and /callback — avoids
    needing server-side session storage for a flow that's otherwise stateless.
    """
    return jwt.encode(
        {"state": state, "code_verifier": code_verifier, "workspace": workspace_account_login},
        settings.session_secret,
        algorithm="HS256",
    )


def unsign_state(token: str) -> dict:
    return jwt.decode(token, settings.session_secret, algorithms=["HS256"])
