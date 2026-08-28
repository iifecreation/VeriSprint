"""Per-workspace MCP server token (see app/mcp_server.py) — WORKSPACE_ADMIN-only, same rotate-not-recover discipline as the SCIM token."""
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit_for_user
from app.auth.dependencies import require_role
from app.db.models import User, UserRole, Workspace
from app.db.session import get_db
from app.schemas import MCPConfigOut

router = APIRouter(prefix="/mcp-config", tags=["mcp"])


@router.get("", response_model=MCPConfigOut)
async def get_mcp_config(
    admin: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)), db: AsyncSession = Depends(get_db)
) -> MCPConfigOut:
    if admin.workspace_id is None:
        return MCPConfigOut(has_token=False)
    workspace = await db.get(Workspace, admin.workspace_id)
    return MCPConfigOut(has_token=workspace is not None and workspace.mcp_token is not None)


@router.post("/rotate-token")
async def rotate_mcp_token(
    admin: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)), db: AsyncSession = Depends(get_db)
) -> dict:
    """Returns the new token in the response body exactly once — same
    discipline as an API key or the SCIM token: rotatable, never re-readable."""
    if admin.workspace_id is None:
        raise HTTPException(status_code=400, detail="Your account isn't attached to a workspace")
    workspace = await db.get(Workspace, admin.workspace_id)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    new_token = secrets.token_urlsafe(32)
    workspace.mcp_token = new_token
    await record_audit_for_user(
        db, user=admin, action="mcp_config.token_rotated", entity_type="workspace", entity_id=str(workspace.id),
    )
    await db.commit()
    return {"mcp_token": new_token}
