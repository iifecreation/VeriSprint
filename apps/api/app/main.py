"""FastAPI entrypoint — wires up all routers. Run with: uvicorn app.main:app --reload"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    accuracy,
    audit,
    auth,
    chat,
    client_portal,
    dashboard,
    flags,
    github_app,
    orphans,
    repos,
    reports,
    roi,
    settings as settings_router,
    slack,
    sprints,
    sso,
    standup,
    tickets,
    work_units,
)

settings = get_settings()

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
    allow_origins=[settings.web_base_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
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
    return {"status": "ok"}
