"""
arq worker entrypoint. Run with:  arq app.queue.worker.WorkerSettings
Redis-backed locally; swap RedisSettings for a managed Redis (e.g. ElastiCache)
in production, or move to SQS + a different consumer if preferred (see brief).
"""
from arq import cron
from arq.connections import RedisSettings

from app.config import get_settings
from app.workers.analysis import analyze_commit
from app.workers.anomaly import detect_activity_anomalies
from app.workers.confidence import compute_confidence
from app.workers.digest import send_daily_digest
from app.workers.drift import detect_ticket_drift
from app.workers.ingestion import ingest_pull_request, ingest_push
from app.workers.orphans import detect_orphan_commits
from app.workers.reconciliation import reconcile_ticket
from app.workers.reports import (
    generate_client_portal_report,
    generate_investor_update,
    generate_onboarding_doc,
    generate_sprint_rollup,
)
from app.workers.scheduler import run_daily_maintenance
from app.workers.standup import generate_standup

settings = get_settings()


class WorkerSettings:
    functions = [
        ingest_push,
        ingest_pull_request,
        analyze_commit,
        compute_confidence,
        reconcile_ticket,
        generate_standup,
        detect_ticket_drift,
        detect_orphan_commits,
        detect_activity_anomalies,
        generate_sprint_rollup,
        generate_investor_update,
        generate_client_portal_report,
        generate_onboarding_doc,
        send_daily_digest,
    ]
    # Runs once a day (07:00 UTC) and fans out orphan-detection, anomaly
    # nudges, and the previous day's digest to every active repo. See
    # app/workers/scheduler.py — nothing here fabricates a schedule per repo,
    # it just dispatches the same real per-repo jobs the API can also trigger manually.
    cron_jobs = [cron(run_daily_maintenance, hour=7, minute=0)]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 10
