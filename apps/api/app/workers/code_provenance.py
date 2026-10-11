"""
Code Provenance worker job — the I/O layer around app/code_provenance.py's
pure classification. Independent of the LLM analysis pipeline (analyze_commit):
runs without ANTHROPIC_API_KEY configured, same "degrade gracefully, never
fabricate" discipline the rest of this codebase already follows for optional
external services.
"""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.ai_signals import is_ai_assisted
from app.code_provenance import candidate_line_hashes, classify_commit_provenance
from app.db.models import CodeLineFingerprint, Commit
from app.db.session import AsyncSessionLocal
from app.integrations.object_storage import get_raw_diff


async def classify_code_provenance(ctx, commit_id: str) -> None:
    async with AsyncSessionLocal() as db:
        commit = await db.get(Commit, UUID(commit_id))
        if commit is None:
            return

        diff = get_raw_diff(commit.raw_diff_object_key)

        candidates = candidate_line_hashes(diff)
        known_hashes: set[str] = set()
        if candidates:
            result = await db.execute(
                select(CodeLineFingerprint.line_hash).where(
                    CodeLineFingerprint.repo_id == commit.repo_id,
                    CodeLineFingerprint.line_hash.in_(candidates),
                )
            )
            known_hashes = {row[0] for row in result.all()}

        outcome = classify_commit_provenance(
            diff=diff, is_ai_assisted=is_ai_assisted(commit.message), known_hashes=known_hashes
        )

        commit.original_engineering_lines = outcome.original_engineering_lines
        commit.ai_disclosed_lines = outcome.ai_disclosed_lines
        commit.duplicate_or_boilerplate_lines = outcome.duplicate_or_boilerplate_lines

        if outcome.new_line_hashes:
            # ON CONFLICT DO NOTHING — two commits racing to add the same
            # new line concurrently (or a retried job re-running this same
            # commit) must never 500 on CodeLineFingerprint's unique
            # constraint; the first one to land just wins the "first seen" credit.
            stmt = (
                pg_insert(CodeLineFingerprint)
                .values(
                    [
                        {"repo_id": commit.repo_id, "line_hash": h, "first_seen_commit_id": commit.id}
                        for h in outcome.new_line_hashes
                    ]
                )
                .on_conflict_do_nothing(index_elements=["repo_id", "line_hash"])
            )
            await db.execute(stmt)

        await db.commit()
