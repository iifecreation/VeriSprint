"""
Investment Profile (Phase 3 competitor-parity): classifies ticket-linked
commit volume into the New Value / Feature Enhancements / Developer
Experience / Keeping the Lights On taxonomy. Pulled out of
app/routers/allocation.py so app/goals.py can target a category's share as a
goal metric without a router importing another router's internals.
"""
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Commit, Ticket

# Ordered — first match wins, same discipline as PR-policy-as-code tools that
# classify by rule order. Security/maintenance language is checked ahead of
# generic "improve"/"enhance" wording so a security patch doesn't get
# miscounted as a Feature Enhancement just because its description also says
# "improves reliability".
CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "new_value": ("new feature", "new platform", "roadmap", "launch", "add support for", "greenfield", "net new"),
    "developer_experience": (
        "tech debt", "technical debt", "refactor", "tooling", "dev experience", "devex", "developer experience",
        "test automation", "ci/cd", "pipeline", "lint", "flaky test", "code quality",
    ),
    "keeping_the_lights_on": (
        "security", "vulnerability", "cve", "dependency bump", "upgrade dependency", "monitoring", "uptime",
        "incident", "outage", "compliance", "on-call", "patch release",
    ),
    "feature_enhancements": (
        "enhance", "improve", "performance", "scalability", "optimi", "rfe", "polish", "ux improvement",
        "usability",
    ),
}


def classify(ticket: Ticket) -> str | None:
    """Returns None (uncategorized) rather than guessing when nothing matches."""
    text = f"{ticket.title} {ticket.description or ''}".lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return category
    return None


class InvestmentProfile:
    """Plain data holder — app/schemas.py's InvestmentProfileReport is the API shape this feeds."""

    def __init__(self) -> None:
        self.lines_by_category: dict[str, int] = {cat: 0 for cat in CATEGORY_KEYWORDS}
        self.tickets_by_category: dict[str, set[UUID]] = {cat: set() for cat in CATEGORY_KEYWORDS}
        self.uncategorized_lines = 0

    def pct_of_categorized(self, category: str) -> float | None:
        total = sum(self.lines_by_category.values())
        if not total:
            return None
        return round(100 * self.lines_by_category[category] / total, 1)


async def compute_investment_profile(
    db: AsyncSession, repo_ids: list[UUID], period_start: datetime, period_end: datetime
) -> InvestmentProfile:
    profile = InvestmentProfile()
    if not repo_ids:
        return profile

    tickets_result = await db.execute(select(Ticket).where(Ticket.repo_id.in_(repo_ids)))
    ticket_by_key: dict[str, Ticket] = {t.key: t for t in tickets_result.scalars().all()}

    commits_result = await db.execute(
        select(Commit.linked_ticket_key, Commit.additions, Commit.deletions).where(
            Commit.repo_id.in_(repo_ids), Commit.committed_at >= period_start, Commit.committed_at <= period_end
        )
    )
    for key, additions, deletions in commits_result.all():
        lines = (additions or 0) + (deletions or 0)
        ticket = ticket_by_key.get(key) if key else None
        category = classify(ticket) if ticket else None
        if category is None:
            profile.uncategorized_lines += lines
            continue
        profile.lines_by_category[category] += lines
        profile.tickets_by_category[category].add(ticket.id)

    return profile
