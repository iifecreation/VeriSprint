"""
Super-Admin Dashboard (spec Section 7) — the internal operator surface: every
workspace, every user, the platform error feed, system-health metrics,
aggregate revenue, and feature-flag rollout control, all cross-tenant. Every
endpoint here is gated by `get_current_admin` — an `AdminAccount`, a table and
token type deliberately separate from the customer `users` table (see
AdminAccount's docstring in app/db/models.py) — never by a customer `User`'s
role, so there's no per-workspace scoping to apply here by design.
"""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit
from app.auth.dependencies import get_current_admin
from app.auth.security import create_access_token
from app.config import get_settings
from app.db.models import (
    AdminAccount,
    AuditLogEntry,
    ContactMessage,
    ErrorEvent,
    FeatureFlag,
    ReconciliationFlag,
    Repo,
    Subscription,
    SystemMetric,
    User,
    UserRole,
    Workspace,
    WorkspacePlanTier,
    WorkspaceStatus,
)
from app.db.session import get_db
from app.schemas import (
    AdminOverview,
    AdminSubscriptionOut,
    AdminUserOut,
    AdminWorkspaceOut,
    AdminWorkspaceUpdate,
    AuditLogEntryOut,
    ContactMessageOut,
    ErrorEventOut,
    FeatureFlagCreate,
    FeatureFlagOut,
    FeatureFlagUpdate,
    ImpersonationTokenOut,
    RepoOut,
    RevenueSummary,
    SystemMetricOut,
)

settings = get_settings()

router = APIRouter(prefix="/admin", tags=["super-admin"])


# --- Panel 1: platform overview ----------------------------------------------

@router.get("/overview", response_model=AdminOverview)
async def get_overview(
    admin: AdminAccount = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
) -> AdminOverview:
    workspace_count = await db.scalar(select(func.count()).select_from(Workspace))
    active_workspace_count = await db.scalar(
        select(func.count()).select_from(Workspace).where(Workspace.status == WorkspaceStatus.ACTIVE)
    )
    user_count = await db.scalar(select(func.count()).select_from(User))
    total_mrr = await db.scalar(select(func.coalesce(func.sum(Workspace.mrr), 0.0)))
    open_error_count = await db.scalar(
        select(func.count()).select_from(ErrorEvent).where(ErrorEvent.resolved_at.is_(None))
    )
    unresolved_flag_count = await db.scalar(
        select(func.count()).select_from(ReconciliationFlag).where(ReconciliationFlag.is_resolved.is_(False))
    )
    open_contact_message_count = await db.scalar(
        select(func.count()).select_from(ContactMessage).where(ContactMessage.resolved_at.is_(None))
    )
    return AdminOverview(
        workspace_count=workspace_count or 0,
        active_workspace_count=active_workspace_count or 0,
        user_count=user_count or 0,
        total_mrr=float(total_mrr or 0.0),
        open_error_count=open_error_count or 0,
        unresolved_flag_count=unresolved_flag_count or 0,
        open_contact_message_count=open_contact_message_count or 0,
    )


# --- Panel 2: workspaces ------------------------------------------------------

@router.get("/workspaces", response_model=list[AdminWorkspaceOut])
async def list_workspaces(
    search: str | None = None,
    status_filter: str | None = None,
    limit: int = 100,
    admin: AdminAccount = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminWorkspaceOut]:
    stmt = select(Workspace).order_by(Workspace.created_at.desc())
    if search:
        stmt = stmt.where(Workspace.name.ilike(f"%{search}%") | Workspace.account_login.ilike(f"%{search}%"))
    if status_filter:
        stmt = stmt.where(Workspace.status == status_filter)
    result = await db.execute(stmt.limit(min(limit, 500)))
    workspaces = list(result.scalars().all())

    out: list[AdminWorkspaceOut] = []
    for ws in workspaces:
        repo_count = await db.scalar(select(func.count()).select_from(Repo).where(Repo.workspace_id == ws.id))
        user_count = await db.scalar(select(func.count()).select_from(User).where(User.workspace_id == ws.id))
        out.append(
            AdminWorkspaceOut(
                id=ws.id, name=ws.name, account_login=ws.account_login, plan_tier=ws.plan_tier.value,
                status=ws.status.value, mrr=ws.mrr, repo_count=repo_count or 0, user_count=user_count or 0,
                created_at=ws.created_at,
            )
        )
    return out


@router.get("/workspaces/{workspace_id}", response_model=AdminWorkspaceOut)
async def get_workspace(
    workspace_id: UUID, admin: AdminAccount = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
) -> AdminWorkspaceOut:
    ws = await db.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    repo_count = await db.scalar(select(func.count()).select_from(Repo).where(Repo.workspace_id == ws.id))
    user_count = await db.scalar(select(func.count()).select_from(User).where(User.workspace_id == ws.id))
    return AdminWorkspaceOut(
        id=ws.id, name=ws.name, account_login=ws.account_login, plan_tier=ws.plan_tier.value,
        status=ws.status.value, mrr=ws.mrr, repo_count=repo_count or 0, user_count=user_count or 0,
        created_at=ws.created_at,
    )


@router.patch("/workspaces/{workspace_id}", response_model=AdminWorkspaceOut)
async def update_workspace(
    workspace_id: UUID,
    payload: AdminWorkspaceUpdate,
    admin: AdminAccount = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminWorkspaceOut:
    ws = await db.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    before = {"status": ws.status.value, "plan_tier": ws.plan_tier.value}
    if payload.status is not None:
        try:
            ws.status = WorkspaceStatus(payload.status)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=f"Unknown status: {payload.status}") from exc
    if payload.plan_tier is not None:
        try:
            ws.plan_tier = WorkspacePlanTier(payload.plan_tier)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=f"Unknown plan_tier: {payload.plan_tier}") from exc

    await db.flush()
    await record_audit(
        db, actor=admin.email, action="admin.workspace_updated", entity_type="workspace", entity_id=str(ws.id),
        workspace_id=ws.id, before=before, after={"status": ws.status.value, "plan_tier": ws.plan_tier.value},
    )
    await db.commit()

    repo_count = await db.scalar(select(func.count()).select_from(Repo).where(Repo.workspace_id == ws.id))
    user_count = await db.scalar(select(func.count()).select_from(User).where(User.workspace_id == ws.id))
    return AdminWorkspaceOut(
        id=ws.id, name=ws.name, account_login=ws.account_login, plan_tier=ws.plan_tier.value,
        status=ws.status.value, mrr=ws.mrr, repo_count=repo_count or 0, user_count=user_count or 0,
        created_at=ws.created_at,
    )


@router.get("/workspaces/{workspace_id}/repos", response_model=list[RepoOut])
async def get_workspace_repos(
    workspace_id: UUID, admin: AdminAccount = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
) -> list[Repo]:
    ws = await db.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    result = await db.execute(select(Repo).where(Repo.workspace_id == ws.id).order_by(Repo.full_name))
    return list(result.scalars().all())


@router.get("/workspaces/{workspace_id}/subscription", response_model=AdminSubscriptionOut | None)
async def get_workspace_subscription(
    workspace_id: UUID, admin: AdminAccount = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
) -> AdminSubscriptionOut | None:
    ws = await db.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    result = await db.execute(select(Subscription).where(Subscription.workspace_id == ws.id))
    sub = result.scalar_one_or_none()
    if sub is None:
        return None
    return AdminSubscriptionOut(
        plan_tier=sub.plan_tier.value, status=sub.status.value, mrr=sub.mrr,
        renewed_at=sub.renewed_at, payment_provider=sub.payment_provider,
    )


@router.post("/workspaces/{workspace_id}/impersonate", response_model=ImpersonationTokenOut)
async def impersonate_workspace(
    workspace_id: UUID, admin: AdminAccount = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
) -> ImpersonationTokenOut:
    """
    "View as this workspace" (Operator Console): issues a normal, short-lived
    access token for a *real* user in the target workspace — never a synthetic
    identity — so every existing authorization path (ensure_workspace_access,
    user.workspace_id defaults) behaves exactly as if that user signed in
    themselves. No refresh token is issued: when the access token expires
    (JWT_ACCESS_TTL_MINUTES, 15 min by default), the impersonated session
    simply ends rather than silently renewing.

    Picks the workspace's longest-tenured WORKSPACE_ADMIN as the one coherent
    "what does this customer see" view; falls back to the longest-tenured
    non-client user if the workspace has no admin yet (e.g. mid-onboarding).
    """
    ws = await db.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    target_result = await db.execute(
        select(User)
        .where(User.workspace_id == ws.id, User.role == UserRole.WORKSPACE_ADMIN)
        .order_by(User.created_at)
        .limit(1)
    )
    target = target_result.scalar_one_or_none()
    if target is None:
        fallback_result = await db.execute(
            select(User)
            .where(User.workspace_id == ws.id, User.role != UserRole.CLIENT)
            .order_by(User.created_at)
            .limit(1)
        )
        target = fallback_result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="This workspace has no user to view it as yet")

    token = create_access_token(
        user_id=target.id, workspace_id=target.workspace_id, role=target.role.value,
        token_version=target.token_version, impersonated_by=admin.id,
    )
    await record_audit(
        db, actor=admin.email, action="admin.impersonation_started", entity_type="workspace", entity_id=str(ws.id),
        workspace_id=ws.id, after={"target_user_id": str(target.id), "target_email": target.email or target.github_login},
    )
    await db.commit()

    return ImpersonationTokenOut(
        access_token=token, expires_in=settings.jwt_access_ttl_minutes * 60,
        target_user_id=target.id, target_user_email=target.email or target.github_login, target_user_role=target.role.value,
    )


# --- Panel 3: users (cross-tenant) -------------------------------------------

@router.get("/users", response_model=list[AdminUserOut])
async def list_all_users(
    search: str | None = None,
    role: str | None = None,
    workspace_id: UUID | None = None,
    limit: int = 200,
    admin: AdminAccount = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminUserOut]:
    stmt = select(User).order_by(User.created_at.desc())
    if search:
        stmt = stmt.where(User.email.ilike(f"%{search}%") | User.github_login.ilike(f"%{search}%"))
    if role:
        stmt = stmt.where(User.role == role)
    if workspace_id:
        stmt = stmt.where(User.workspace_id == workspace_id)
    result = await db.execute(stmt.limit(min(limit, 1000)))
    users = list(result.scalars().all())

    workspace_ids = {u.workspace_id for u in users if u.workspace_id is not None}
    names_by_id: dict[UUID, str] = {}
    if workspace_ids:
        ws_result = await db.execute(select(Workspace.id, Workspace.name).where(Workspace.id.in_(workspace_ids)))
        names_by_id = dict(ws_result.all())

    return [
        AdminUserOut(
            id=u.id, email=u.email, github_login=u.github_login, name=u.name, role=u.role.value,
            workspace_id=u.workspace_id, workspace_name=names_by_id.get(u.workspace_id) if u.workspace_id else None,
            last_login_at=u.last_login_at, created_at=u.created_at,
        )
        for u in users
    ]


# --- Panel 4: error monitoring ------------------------------------------------

@router.get("/errors", response_model=list[ErrorEventOut])
async def list_errors(
    source: str | None = None,
    severity: str | None = None,
    include_resolved: bool = False,
    limit: int = 200,
    admin: AdminAccount = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[ErrorEvent]:
    stmt = select(ErrorEvent).order_by(ErrorEvent.created_at.desc())
    if source:
        stmt = stmt.where(ErrorEvent.source == source)
    if severity:
        stmt = stmt.where(ErrorEvent.severity == severity)
    if not include_resolved:
        stmt = stmt.where(ErrorEvent.resolved_at.is_(None))
    result = await db.execute(stmt.limit(min(limit, 1000)))
    return list(result.scalars().all())


@router.post("/errors/{error_id}/resolve", response_model=ErrorEventOut)
async def resolve_error(
    error_id: UUID, admin: AdminAccount = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
) -> ErrorEvent:
    error = await db.get(ErrorEvent, error_id)
    if error is None:
        raise HTTPException(status_code=404, detail="Error not found")
    error.resolved_at = datetime.now(timezone.utc)
    await db.flush()
    await record_audit(
        db, actor=admin.email, action="admin.error_resolved", entity_type="error_event", entity_id=str(error.id),
        workspace_id=error.workspace_id,
    )
    await db.commit()
    await db.refresh(error)
    return error


# --- Panel 9: contact messages -------------------------------------------------

@router.get("/contact-messages", response_model=list[ContactMessageOut])
async def list_contact_messages(
    include_resolved: bool = False,
    limit: int = 200,
    admin: AdminAccount = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[ContactMessage]:
    stmt = select(ContactMessage).order_by(ContactMessage.created_at.desc())
    if not include_resolved:
        stmt = stmt.where(ContactMessage.resolved_at.is_(None))
    result = await db.execute(stmt.limit(min(limit, 1000)))
    return list(result.scalars().all())


@router.post("/contact-messages/{message_id}/resolve", response_model=ContactMessageOut)
async def resolve_contact_message(
    message_id: UUID, admin: AdminAccount = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
) -> ContactMessage:
    message = await db.get(ContactMessage, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    message.resolved_at = datetime.now(timezone.utc)
    # Not resolved_by_user_id = admin.id — that FK targets users.id, and
    # AdminAccount is a deliberately separate table (see its docstring). The
    # audit entry's `actor` string below is the traceable record instead.
    await db.flush()
    await record_audit(
        db, actor=admin.email, action="admin.contact_message_resolved", entity_type="contact_message", entity_id=str(message.id),
    )
    await db.commit()
    await db.refresh(message)
    return message


# --- Panel 5: system health ---------------------------------------------------

@router.get("/metrics", response_model=list[SystemMetricOut])
async def list_metrics(
    metric_name: str | None = None,
    since: datetime | None = None,
    limit: int = 500,
    admin: AdminAccount = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[SystemMetric]:
    stmt = select(SystemMetric).order_by(SystemMetric.recorded_at.desc())
    if metric_name:
        stmt = stmt.where(SystemMetric.metric_name == metric_name)
    if since:
        stmt = stmt.where(SystemMetric.recorded_at >= since)
    result = await db.execute(stmt.limit(min(limit, 5000)))
    return list(result.scalars().all())


# --- Panel 6: revenue ----------------------------------------------------------

@router.get("/revenue", response_model=RevenueSummary)
async def get_revenue_summary(
    admin: AdminAccount = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
) -> RevenueSummary:
    result = await db.execute(select(Workspace.plan_tier, Workspace.status, Workspace.mrr))
    rows = result.all()

    by_plan_tier: dict[str, float] = {}
    by_status: dict[str, int] = {}
    total_mrr = 0.0
    for plan_tier, status, mrr in rows:
        by_plan_tier[plan_tier.value] = by_plan_tier.get(plan_tier.value, 0.0) + mrr
        by_status[status.value] = by_status.get(status.value, 0) + 1
        total_mrr += mrr

    return RevenueSummary(total_mrr=total_mrr, workspace_count=len(rows), by_plan_tier=by_plan_tier, by_status=by_status)


# --- Panel 7: feature flags ----------------------------------------------------

@router.get("/flags", response_model=list[FeatureFlagOut])
async def list_feature_flags(
    admin: AdminAccount = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
) -> list[FeatureFlag]:
    result = await db.execute(select(FeatureFlag).order_by(FeatureFlag.key))
    return list(result.scalars().all())


@router.post("/flags", response_model=FeatureFlagOut)
async def create_feature_flag(
    payload: FeatureFlagCreate, admin: AdminAccount = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
) -> FeatureFlag:
    existing = await db.execute(select(FeatureFlag).where(FeatureFlag.key == payload.key))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail=f"Feature flag '{payload.key}' already exists")

    min_plan_tier = WorkspacePlanTier(payload.min_plan_tier) if payload.min_plan_tier else None
    flag = FeatureFlag(
        key=payload.key, description=payload.description, enabled_globally=payload.enabled_globally,
        min_plan_tier=min_plan_tier,
    )
    db.add(flag)
    await db.flush()
    await record_audit(
        db, actor=admin.email, action="admin.flag_created", entity_type="feature_flag", entity_id=str(flag.id),
        after={"key": flag.key, "enabled_globally": flag.enabled_globally},
    )
    await db.commit()
    await db.refresh(flag)
    return flag


@router.patch("/flags/{flag_id}", response_model=FeatureFlagOut)
async def update_feature_flag(
    flag_id: UUID,
    payload: FeatureFlagUpdate,
    admin: AdminAccount = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> FeatureFlag:
    flag = await db.get(FeatureFlag, flag_id)
    if flag is None:
        raise HTTPException(status_code=404, detail="Feature flag not found")

    before = {
        "enabled_globally": flag.enabled_globally, "enabled_workspace_ids": flag.enabled_workspace_ids,
        "min_plan_tier": flag.min_plan_tier.value if flag.min_plan_tier else None,
    }
    updates = payload.model_dump(exclude_unset=True)
    if "min_plan_tier" in updates:
        updates["min_plan_tier"] = WorkspacePlanTier(updates["min_plan_tier"]) if updates["min_plan_tier"] else None
    for field, value in updates.items():
        setattr(flag, field, value)
    await db.flush()
    await record_audit(
        db, actor=admin.email, action="admin.flag_updated", entity_type="feature_flag", entity_id=str(flag.id),
        before=before, after=payload.model_dump(exclude_unset=True),
    )
    await db.commit()
    await db.refresh(flag)
    return flag


# --- Panel 8: global audit trail -----------------------------------------------

@router.get("/audit", response_model=list[AuditLogEntryOut])
async def list_all_audit_entries(
    workspace_id: UUID | None = None,
    action: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = 200,
    admin: AdminAccount = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AuditLogEntry]:
    stmt = select(AuditLogEntry).order_by(AuditLogEntry.created_at.desc())
    if workspace_id is not None:
        stmt = stmt.where(AuditLogEntry.workspace_id == workspace_id)
    if action is not None:
        stmt = stmt.where(AuditLogEntry.action == action)
    if start is not None:
        stmt = stmt.where(AuditLogEntry.created_at >= start)
    if end is not None:
        stmt = stmt.where(AuditLogEntry.created_at <= end)
    result = await db.execute(stmt.limit(min(limit, 2000)))
    return list(result.scalars().all())
