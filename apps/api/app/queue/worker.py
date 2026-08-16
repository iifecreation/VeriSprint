"""
arq worker entrypoint. Run with:  arq app.queue.worker.WorkerSettings
Redis-backed locally; swap RedisSettings for a managed Redis (e.g. ElastiCache)
in production, or move to SQS + a different consumer if preferred (see brief).

Every job is wrapped with `capture_worker_errors` (spec Section 7) so a
failure lands a real `ErrorEvent` for the Super-Admin Dashboard without any
individual job needing to remember to do that itself — arq's own
retry/max_tries behavior is unaffected since the exception still propagates.
"""
from arq import cron
from arq.connections import RedisSettings

from app.config import get_settings
from app.observability import capture_worker_errors
from app.workers.analysis import analyze_commit
from app.workers.anomaly import detect_activity_anomalies
from app.workers.blockers import detect_blockers
from app.workers.confidence import compute_confidence
from app.workers.digest import send_daily_digest
from app.workers.drift import detect_ticket_drift
from app.workers.ingestion import ingest_pull_request, ingest_push
from app.workers.metrics import collect_system_metrics
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

if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.env, send_default_pii=False)


class WorkerSettings:
    functions = [
        capture_worker_errors("ingestion")(ingest_push),
        capture_worker_errors("ingestion")(ingest_pull_request),
        capture_worker_errors("llm")(analyze_commit),
        capture_worker_errors("llm")(compute_confidence),
        capture_worker_errors("reconciliation")(reconcile_ticket),
        capture_worker_errors("llm")(generate_standup),
        capture_worker_errors("llm")(detect_ticket_drift),
        capture_worker_errors("ingestion")(detect_orphan_commits),
        capture_worker_errors("analytics")(detect_activity_anomalies),
        capture_worker_errors("analytics")(detect_blockers),
        capture_worker_errors("llm")(generate_sprint_rollup),
        capture_worker_errors("llm")(generate_investor_update),
        capture_worker_errors("llm")(generate_client_portal_report),
        capture_worker_errors("llm")(generate_onboarding_doc),
        capture_worker_errors("email")(send_daily_digest),
    ]
    # Runs once a day (07:00 UTC) and fans out orphan-detection, anomaly
    # nudges, and the previous day's digest to every active repo. See
    # app/workers/scheduler.py — nothing here fabricates a schedule per repo,
    # it just dispatches the same real per-repo jobs the API can also trigger manually.
    cron_jobs = [
        cron(capture_worker_errors("scheduler")(run_daily_maintenance), hour=7, minute=0),
        # Every 5 minutes — frequent enough for the Super-Admin system-health
        # panel to show a real trend line, not just a daily point.
        cron(capture_worker_errors("metrics")(collect_system_metrics), minute={0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55}),
    ]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 10
