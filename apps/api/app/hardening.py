"""
Production hardening that applies to the whole API:

- `check_production_config` refuses to boot a production process with
  missing, weak, or default secrets (a default JWT_SECRET would let anyone
  forge a super-admin token).
- `BodySizeLimitMiddleware` rejects oversized request bodies before they
  are read into memory.
- `apply_security_headers` adds strict response headers to every reply.
"""
import ipaddress
import logging
import socket
from urllib.parse import urlparse

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.config import Settings

logger = logging.getLogger(__name__)

_DEFAULT_SECRETS = {"dev-jwt-secret-change-me", "dev-secret-change-me", "change-me", "secret", ""}
# GitHub push payloads can be large; everything else is small JSON.
_LARGE_BODY_PATHS = {"/github/webhook": 25_000_000}


class InsecureConfigError(RuntimeError):
    pass


def check_production_config(settings: Settings) -> None:
    """Raise at startup if a production deployment is misconfigured. Does
    nothing outside production so local dev keeps working with defaults."""
    if not settings.is_production:
        return
    problems: list[str] = []

    for name in ("jwt_secret", "session_secret"):
        value = getattr(settings, name)
        if value in _DEFAULT_SECRETS or len(value) < 32:
            problems.append(f"{name.upper()} must be a random value of at least 32 characters (not the default)")
    if settings.jwt_secret == settings.session_secret:
        problems.append("JWT_SECRET and SESSION_SECRET must be different values")
    if not settings.github_webhook_secret:
        problems.append("GITHUB_WEBHOOK_SECRET must be set (unsigned webhooks are rejected in production)")

    for name in ("api_base_url", "web_base_url", "admin_base_url", "marketing_base_url"):
        url = getattr(settings, name)
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname in (None, "localhost", "127.0.0.1"):
            problems.append(f"{name.upper()} must be a public https:// URL (got {url!r})")

    if "verisprint:verisprint@" in settings.database_url:
        problems.append("DATABASE_URL is using the default local-dev password")

    if problems:
        raise InsecureConfigError("Refusing to start in production:\n  - " + "\n  - ".join(problems))


def allowed_hosts(settings: Settings) -> list[str]:
    hosts = {urlparse(settings.api_base_url).hostname or ""}
    hosts.update(h.strip() for h in settings.allowed_hosts.split(",") if h.strip())
    return sorted(h for h in hosts if h)


class BodySizeLimitMiddleware:
    """Pure ASGI middleware: 413s a request whose declared or streamed body
    exceeds the limit, without buffering the whole thing first."""

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        limit = _LARGE_BODY_PATHS.get(scope.get("path", ""), self.max_bytes)

        declared = dict(scope.get("headers") or []).get(b"content-length")
        if declared is not None:
            try:
                if int(declared) > limit:
                    await _send_413(send)
                    return
            except ValueError:
                await _send_413(send)
                return

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise _BodyTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except _BodyTooLarge:
            await _send_413(send)


class _BodyTooLarge(Exception):
    pass


async def _send_413(send: Send) -> None:
    body = b'{"detail":"Request body is too large."}'
    await send({"type": "http.response.start", "status": 413,
                "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
    await send({"type": "http.response.body", "body": body})


def apply_security_headers(path: str, headers, is_production: bool) -> None:
    """Headers for a JSON API that is never meant to be rendered or framed."""
    headers["X-Content-Type-Options"] = "nosniff"
    headers["X-Frame-Options"] = "DENY"
    headers["Referrer-Policy"] = "no-referrer"
    headers["Cross-Origin-Opener-Policy"] = "same-origin"
    headers["Cross-Origin-Resource-Policy"] = "same-site"
    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    # The interactive docs (dev only) need scripts; everything else is JSON.
    if not path.startswith(("/docs", "/redoc")):
        headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    if path.startswith(("/auth", "/scim", "/mcp-config", "/sso-config", "/billing")):
        headers["Cache-Control"] = "no-store"
    if is_production:
        headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"


def assert_public_https_url(url: str) -> None:
    """SSRF guard for URLs a customer supplies and the server then fetches
    (e.g. an SSO issuer). Requires https and a hostname that resolves only
    to public IP addresses — blocks localhost, private networks, and cloud
    metadata endpoints like 169.254.169.254."""
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("URL must start with https://")
    if parsed.username or parsed.password:
        raise ValueError("URL must not contain credentials")
    try:
        infos = socket.getaddrinfo(parsed.hostname, parsed.port or 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise ValueError("URL host could not be resolved") from exc
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global or ip.is_multicast:
            raise ValueError("URL must point to a public internet address")
