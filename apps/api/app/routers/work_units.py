"""
Multi-Repo / Monorepo Intelligence (spec Section 5.10): stitches commits that
share a ticket key across every repo in an installation into one logical
unit of work, instead of reporting on each repo in isolation. Only tickets
whose commits genuinely span more than one repo are surfaced — a single-repo
ticket isn't "multi-repo intelligence," it's just a ticket.
"""
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_workspace_for_user
from app.db.models import Commit, Repo, Workspace
from app.db.session import get_db
from app.schemas import LogicalWorkUnit

router = APIRouter(prefix="/work-units", tags=["multi-repo"])


@router.get("", response_model=list[LogicalWorkUnit])
async def list_logical_work_units(
    workspace: Workspace = Depends(get_workspace_for_user), db: AsyncSession = Depends(get_db)
) -> list[LogicalWorkUnit]:
    repos_result = await db.execute(select(Repo).where(Repo.workspace_id == workspace.id))
    repos = list(repos_result.scalars().all())
    repo_by_id = {r.id: r for r in repos}
    if not repo_by_id:
        return []

    commits_result = await db.execute(
        select(Commit).where(Commit.repo_id.in_(repo_by_id.keys()), Commit.linked_ticket_key.is_not(None))
    )
    commits = list(commits_result.scalars().all())

    by_key: dict[str, list[Commit]] = defaultdict(list)
    for commit in commits:
        by_key[commit.linked_ticket_key].append(commit)

    units: list[LogicalWorkUnit] = []
    for ticket_key, ticket_commits in by_key.items():
        repo_full_names = sorted({repo_by_id[c.repo_id].full_name for c in ticket_commits})
        if len(repo_full_names) < 2:
            continue  # genuinely cross-repo work only
        units.append(
            LogicalWorkUnit(
                ticket_key=ticket_key,
                repo_full_names=repo_full_names,
                commit_count=len(ticket_commits),
                commit_ids=[c.id for c in ticket_commits],
                first_committed_at=min(c.committed_at for c in ticket_commits),
                last_committed_at=max(c.committed_at for c in ticket_commits),
            )
        )

    units.sort(key=lambda u: u.last_committed_at, reverse=True)
    return units
