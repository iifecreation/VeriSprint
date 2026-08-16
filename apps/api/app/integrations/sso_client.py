"""
Generic OIDC SSO (spec Section 5.11, Enterprise tier): a real, standards-
compliant Authorization Code + PKCE flow against whatever IdP the customer
configures (Okta, Azure AD, Google Workspace, OneLogin, ...) via the generic
OIDC_ISSUER/OIDC_CLIENT_ID/OIDC_CLIENT_SECRET env vars.

This is genuinely functional code, not a stub — but it has never run against
a real customer IdP, only been reviewed for correctness against the OIDC
spec. Activating it for a given customer means pointing OIDC_ISSUER at their
IdP and registering OIDC_REDIRECT_URL as an allowed callback there.
"""
import base64
import hashlib
import secrets
from functools import lru_cache

import httpx
import jwt
from jwt import PyJWKClient

from app.config import get_settings

settings = get_settings()


class OIDCNotConfigured(RuntimeError):
    pass


def _require_config() -> None:
    if not (settings.oidc_issuer and settings.oidc_client_id and settings.oidc_client_secret and settings.oidc_redirect_url):
        raise OIDCNotConfigured(
            "SSO is not configured — set OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URL"
        )


@lru_cache
def _discover() -> dict:
    """Fetch and cache the IdP's OIDC discovery document."""
    _require_config()
    resp = httpx.get(f"{settings.oidc_issuer.rstrip('/')}/.well-known/openid-configuration", timeout=10)
    resp.raise_for_status()
    return resp.json()


def generate_pkce_pair() -> tuple[str, str]:
    """Returns (code_verifier, code_challenge) per RFC 7636."""
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(40)).rstrip(b"=").decode()
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return verifier, challenge


def build_authorize_url(state: str, code_challenge: str) -> str:
    doc = _discover()
    params = {
        "response_type": "code",
        "client_id": settings.oidc_client_id,
        "redirect_uri": settings.oidc_redirect_url,
        "scope": "openid email profile",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    query = str(httpx.QueryParams(params))
    return f"{doc['authorization_endpoint']}?{query}"


def exchange_code_for_claims(code: str, code_verifier: str) -> dict:
    """Exchange an authorization code for tokens, verify the id_token, and return its claims."""
    doc = _discover()
    resp = httpx.post(
        doc["token_endpoint"],
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.oidc_redirect_url,
            "client_id": settings.oidc_client_id,
            "client_secret": settings.oidc_client_secret,
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
        audience=settings.oidc_client_id,
        issuer=doc["issuer"],
    )
    return claims


def sign_state(state: str, code_verifier: str) -> str:
    """
    Pack (state, code_verifier) into a short-lived signed JWT stored client-side
    (a cookie) between /login and /callback — avoids needing server-side
    session storage for a flow that's otherwise stateless.
    """
    return jwt.encode(
        {"state": state, "code_verifier": code_verifier},
        settings.session_secret,
        algorithm="HS256",
    )


def unsign_state(token: str) -> dict:
    return jwt.decode(token, settings.session_secret, algorithms=["HS256"])
