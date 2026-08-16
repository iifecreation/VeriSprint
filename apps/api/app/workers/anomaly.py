"""
Anomaly Check-In Nudges (spec Section 5.9): detects a real, meaningful drop in
a person's commit activity relative to their own recent baseline, and raises
a gentle check-in suggestion — framed around blockers/wellbeing, never as a
penalty. Pure statistics on real commit timestamps; no LLM call, no guessing.
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select

from app.audit import record_audit
from app.db.models import Commit, ReconciliationFlag, ReconciliationFlagType
from app.db.session import AsyncSessionLocal

BASELINE_WEEKS = 4
MIN_BASELINE_COMMITS_PER_WEEK = 2.0  # below this, a "drop" isn't meaningful — too little signal
DROP_RATIO_THRESHOLD = 0.3  # flag if this week's count is under 30% of the baseline


async def detect_activity_anomalies(ctx, repo_id: str) -> None:
    now = datetime.now(timezone.utc)
    current_week_start = now - timedelta(days=7)
    baseline_start = now - timedelta(days=7 * (BASELINE_WEEKS + 1))
    baseline_end = current_week_start

    async with AsyncSessionLocal() as db:
        # Real authors active in the baseline window — no author list is guessed.
        authors_result = await db.execute(
            select(Commit.author_github_login)
            .where(Commit.repo_id == UUID(repo_id), Commit.committed_at >= baseline_start)
            .distinct()
        )
        authors = [a for (a,) in authors_result.all()]

        for author in authors:
            baseline_count = await db.scalar(
                select(func.count()).select_from(Commit).where(
                    Commit.repo_id == UUID(repo_id),
                    Commit.author_github_login == author,
                    Commit.committed_at >= baseline_start,
                    Commit.committed_at < baseline_end,
                )
            )
            baseline_per_week = (baseline_count or 0) / BASELINE_WEEKS
            if baseline_per_week < MIN_BASELINE_COMMITS_PER_WEEK:
                continue  # too little history to call anything a "drop"

            observed_count = await db.scalar(
                select(func.count()).select_from(Commit).where(
                    Commit.repo_id == UUID(repo_id),
                    Commit.author_github_login == author,
                    Commit.committed_at >= current_week_start,
                )
            )
            observed_count = observed_count or 0

            if observed_count >= baseline_per_week * DROP_RATIO_THRESHOLD:
                continue  # no meaningful drop

            existing = await db.execute(
                select(ReconciliationFlag).where(
                    ReconciliationFlag.repo_id == UUID(repo_id),
                    ReconciliationFlag.person_github_login == author,
                    ReconciliationFlag.flag_type == ReconciliationFlagType.ANOMALY_ACTIVITY_DROP,
                    ReconciliationFlag.is_resolved.is_(False),
                )
            )
            if existing.scalar_one_or_none() is not None:
                continue  # already nudged and not yet resolved

            flag = ReconciliationFlag(
                repo_id=UUID(repo_id),
                person_github_login=author,
                flag_type=ReconciliationFlagType.ANOMALY_ACTIVITY_DROP,
                question=(
                    f"@{author}'s commit activity this week ({observed_count}) is well below "
                    f"their recent average (~{baseline_per_week:.1f}/week). Worth a quick "
                    "check-in — anything blocking them, or just heads-down on something offline?"
                ),
                detail_json={
                    "observed_commits_last_week": observed_count,
                    "baseline_commits_per_week": round(baseline_per_week, 2),
                    "baseline_weeks": BASELINE_WEEKS,
                },
            )
            db.add(flag)
            await db.flush()
            await record_audit(
                db,
                actor="system",
                action="reconciliation_flag.created",
                entity_type="reconciliation_flag",
                entity_id=str(flag.id),
                repo_id=UUID(repo_id),
                after={"flag_type": "anomaly_activity_drop", "person": author, "observed": observed_count, "baseline_per_week": baseline_per_week},
            )

        await db.commit()
