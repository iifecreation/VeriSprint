"""
Slack app surface (Step 8): Bolt request handler mounted under FastAPI for
digest delivery and Repo Chat queries directly from Slack.
"""
from fastapi import APIRouter, HTTPException, Request
from slack_bolt.adapter.fastapi.async_handler import AsyncSlackRequestHandler

from app.integrations.slack_client import get_bolt_app

router = APIRouter(prefix="/slack", tags=["slack"])


@router.post("/events")
async def slack_events(request: Request):
    try:
        bolt_app = get_bolt_app()
    except RuntimeError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    handler = AsyncSlackRequestHandler(bolt_app)
    return await handler.handle(request)
