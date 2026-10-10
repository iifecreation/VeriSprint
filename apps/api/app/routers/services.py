"""
Service segmentation (Phase 7 competitor-parity): CRUD for a named multi-repo
grouping — see app/db/models.py's Service docstring. A repo joins a Service
via `PATCH /repos/{id}` (RepoUpdate.service_id), not through this router —
Service ownership of a repo is a property of the repo, same as its Slack
channel. Consumed by app/auth/dependencies.py's get_repo_ids_for_scope.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit_for_user
from app.auth.dependencies import ensure_workspace_access, get_internal_user
from app.db.models import Repo, Service, User
from app.db.session import get_db
from app.schemas import ServiceCreate, ServiceOut
from app.billing_access import require_active_access

router = APIRouter(prefix="/services", tags=["services"], dependencies=[Depends(require_active_access)])


async def _service_out(db: AsyncSession, service: Service) -> ServiceOut:
    result = await db.execute(select(Repo.id).where(Repo.service_id == service.id))
    return ServiceOut(
        id=service.id, workspace_id=service.workspace_id, name=service.name, created_at=service.created_at,
        repo_ids=[r for (r,) in result.all()],
    )


async def _service_for_user(
    service_id: UUID, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> Service:
    service = await db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    ensure_workspace_access(user, service.workspace_id)
    return service


@router.get("", response_model=list[ServiceOut])
async def list_services(user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)) -> list[ServiceOut]:
    if user.workspace_id is None:
        return []
    result = await db.execute(select(Service).where(Service.workspace_id == user.workspace_id).order_by(Service.name))
    return [await _service_out(db, s) for s in result.scalars().all()]


@router.post("", response_model=ServiceOut)
async def create_service(
    payload: ServiceCreate, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> ServiceOut:
    if user.workspace_id is None:
        raise HTTPException(status_code=400, detail="Your account isn't attached to a workspace")
    service = Service(workspace_id=user.workspace_id, name=payload.name)
    db.add(service)
    await db.flush()
    await record_audit_for_user(
        db, user=user, action="service.created", entity_type="service", entity_id=str(service.id),
        after={"name": service.name},
    )
    await db.commit()
    await db.refresh(service)
    return await _service_out(db, service)


@router.delete("/{service_id}")
async def delete_service(
    service: Service = Depends(_service_for_user), user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> dict:
    # Member repos aren't deleted — just ungrouped, same as unsetting
    # slack_channel_id would never delete the repo.
    repos_result = await db.execute(select(Repo).where(Repo.service_id == service.id))
    for repo in repos_result.scalars().all():
        repo.service_id = None
    await record_audit_for_user(
        db, user=user, action="service.deleted", entity_type="service", entity_id=str(service.id),
        before={"name": service.name},
    )
    await db.delete(service)
    await db.commit()
    return {"ok": True}
