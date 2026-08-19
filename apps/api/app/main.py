"""FastAPI entrypoint — wires up all routers. Run with: uvicorn app.main:app --reload"""
import logging
import sys
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import get_settings
from app.db.session import AsyncSessionLocal
from app.observability import record_error
from app.routers import (
    accuracy,
    admin,
    allocation,
    audit,
    auth,
    billing,
    capitalization,
    changelog,
    chat,
    client_portal,
    code_health,
    contributions,
    dashboard,
    dora,
    flags,
    forecast,
    github_app,
    goals,
    integrations,
    orphans,
    pr_autoroute,
    pulse,
    repos,
    reports,
    risk,
    roi,
    scim,
    settings as settings_router,
    slack,
    sprints,
    sso,
    sso_config,
    standup,
    tickets,
    value_stream,
    work_units,
    working_agreements,
)

settings = get_settings()

# One-line-per-record format with a timestamp — not full structured JSON, but
# enough for any log aggregator (CloudWatch, Datadog, etc.) to parse a level
# and message without extra config. Explicit `stream=sys.stdout` since the
# platform default (stderr) gets treated as an error stream by some
# container log collectors.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.env,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        send_default_pii=False,
    )

app = FastAPI(
    title="VeriSprint API",
    description=(
        "Ingestion + API layer for VeriSprint: analyzes commits/PRs with Claude, "
        "computes per-ticket Confidence Scores, reconciles claimed vs. shipped work, "
        "auto-drafts standups, and answers Repo Chat questions."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    # Three separate frontend deploys (product app, operator console,
    # marketing site) each need to call this API from their own origin.
    allow_origins=[settings.web_base_url, settings.admin_base_url, settings.marketing_base_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Only compresses responses already >500 bytes (its own default) — cheap win
# for the larger analytics/report JSON payloads (allocation, changelog,
# audit export) without touching small ones.
app.add_middleware(GZipMiddleware, minimum_size=500)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Baseline headers every response should carry — this is a JSON API with
    no cookie-based auth (bearer tokens only, see app/auth/), so there's no
    CSRF surface here, but these still matter: `nosniff` and the frame/referrer
    policy protect against this API's responses ever being misused if a
    browser is tricked into rendering or embedding one directly."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.env == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catches only genuinely unhandled exceptions — FastAPI/Starlette already
    routes `HTTPException` (expected 4xx control flow) around this handler, so
    every ErrorEvent this writes is a real 500, not a validation error someone
    surfaced on purpose."""
    error_id = str(uuid.uuid4())
    logger.exception("Unhandled exception on %s %s (error_id=%s)", request.method, request.url.path, error_id)
    await record_error(
        source="api",
        message=f"{request.method} {request.url.path}: {exc}",
        stack_ref=error_id,
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error", "error_id": error_id})

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(billing.router)
app.include_router(dora.router)
app.include_router(changelog.router)
app.include_router(code_health.router)
app.include_router(contributions.router)
app.include_router(allocation.router)
app.include_router(risk.router)
app.include_router(goals.router)
app.include_router(integrations.router)
app.include_router(value_stream.router)
app.include_router(pr_autoroute.router)
app.include_router(forecast.router)
app.include_router(capitalization.router)
app.include_router(pulse.router)
app.include_router(working_agreements.router)
app.include_router(sso_config.router)
app.include_router(scim.router)
app.include_router(github_app.router)
app.include_router(repos.router)
app.include_router(tickets.router)
app.include_router(dashboard.router)
app.include_router(standup.router)
app.include_router(chat.router)
app.include_router(slack.router)
app.include_router(flags.router)
app.include_router(audit.router)
app.include_router(orphans.router)
app.include_router(reports.router)
app.include_router(client_portal.router)
app.include_router(sprints.router)
app.include_router(accuracy.router)
app.include_router(roi.router)
app.include_router(work_units.router)
app.include_router(sso.router)
app.include_router(settings_router.router)


@app.get("/health")
async def health() -> dict:
    """Liveness only — always 200 if the process is up, no dependency
    checks. Load balancers/uptime monitors hit this; it must never flap
    because Postgres had a slow moment."""
    return {"status": "ok"}


@app.get("/health/ready")
async def readiness() -> JSONResponse:
    """Readiness — verifies the one dependency every request actually
    needs (Postgres). A container orchestrator should stop routing traffic
    here on a non-200, but this is deliberately separate from `/health` so
    a DB blip doesn't get misread as the process itself being down."""
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        return JSONResponse(status_code=200, content={"status": "ok", "database": "ok"})
    except Exception as exc:
        logger.error("Readiness check failed: %s", exc)
        return JSONResponse(status_code=503, content={"status": "unavailable", "database": "unreachable"})
