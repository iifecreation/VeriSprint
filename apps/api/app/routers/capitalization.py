"""
Cost Capitalization Report (Phase 3 competitor-parity): splits engineering
work into capitalizable new development vs. non-capitalizable maintenance —
a real classification from ticket title/description keywords, not an LLM
guess — with hours estimated from real commit volume and cost from the
workspace's configured hourly rate (null until one is set, same discipline
as the ROI calculator).
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_repo_for_user, require_feature_flag
from app.db.models import Commit, Repo, Ticket, Workspace
from app.db.session import get_db
from app.schemas import CapitalizationEntry, CapitalizationReport
from app.billing_access import require_active_access

router = APIRouter(prefix="/capitalization", tags=["capitalization"], dependencies=[Depends(require_active_access)])

# Real, transparent keyword classification — not an LLM guess.
_MAINTENANCE_KEYWORDS = ("bug", "fix", "hotfix", "chore", "patch", "regression")
# Minutes of engineering time a single commit is assumed to represent, for
# lack of real time-tracking data — a stated assumption, not a hidden one.
_MINUTES_PER_COMMIT = 45


def _classify(ticket: Ticket) -> str:
    text = f"{ticket.title} {ticket.description or ''}".lower()
    return "non_capitalizable_maintenance" if any(kw in text for kw in _MAINTENANCE_KEYWORDS) else "capitalizable_new_development"


@router.get("", response_model=CapitalizationReport, dependencies=[Depends(require_feature_flag("cost_capitalization"))])
async def get_capitalization_report(
    period_start: datetime,
    period_end: datetime,
    repo: Repo = Depends(get_repo_for_user),
    db: AsyncSession = Depends(get_db),
) -> CapitalizationReport:
    workspace = await db.get(Workspace, repo.workspace_id)
    hourly_rate = workspace.hourly_rate_usd if workspace else None

    tickets_result = await db.execute(select(Ticket).where(Ticket.repo_id == repo.id))
    tickets = list(tickets_result.scalars().all())
    ticket_by_key = {t.key: t for t in tickets}

    commits_result = await db.execute(
        select(Commit.linked_ticket_key).where(
            Commit.repo_id == repo.id, Commit.committed_at >= period_start, Commit.committed_at <= period_end,
            Commit.linked_ticket_key.is_not(None),
        )
    )
    commit_keys = [k for (k,) in commits_result.all()]

    buckets: dict[str, dict] = {
        "capitalizable_new_development": {"tickets": set(), "commit_count": 0},
        "non_capitalizable_maintenance": {"tickets": set(), "commit_count": 0},
    }
    for key in commit_keys:
        ticket = ticket_by_key.get(key)
        category = _classify(ticket) if ticket else "capitalizable_new_development"  # unlinked-to-tracked-ticket work assumed new dev, not penalized
        buckets[category]["commit_count"] += 1
        if ticket:
            buckets[category]["tickets"].add(ticket.id)

    entries = []
    for category, data in buckets.items():
        hours = round(data["commit_count"] * _MINUTES_PER_COMMIT / 60, 2)
        entries.append(
            CapitalizationEntry(
                category=category, ticket_count=len(data["tickets"]), commit_count=data["commit_count"],
                estimated_hours=hours, estimated_cost_usd=round(hours * hourly_rate, 2) if hourly_rate else None,
            )
        )

    return CapitalizationReport(period_start=period_start, period_end=period_end, hourly_rate_usd=hourly_rate, entries=entries)
