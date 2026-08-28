"""
MCP server (Model Context Protocol — open spec published by Anthropic, not a
proprietary/trademarked feature we're building against anyone's IP) exposing
a workspace's Evidence Ledger to external MCP clients — Claude Desktop,
Cursor, or any other MCP-compatible tool — as real, queryable tools instead
of a dashboard you have to remember to open.

Auth is a per-workspace bearer token (`Workspace.mcp_token`, generated from
Settings → MCP, same rotate-not-recover discipline as the SCIM token) passed
as an explicit `workspace_token` argument on every tool call. This is
deliberately simpler than wiring the SDK's OAuthAuthorizationServerProvider —
that machinery is built for delegated user-auth flows a third-party client
redirects through; a single static workspace credential doesn't need it, the
same way the SCIM integration authenticates with one bearer token rather
than a full OAuth dance.

Every tool below is read-only and calls into the same functions/queries the
authenticated REST API uses — this is a second transport onto real data, not
a separate mock surface.
"""
from mcp.server.mcpserver import MCPServer
from sqlalchemy import select

from app.db.models import ConfidenceScore, EvidenceItem, Repo, Ticket, Workspace
from app.db.session import AsyncSessionLocal
from app.integrations.llm_client import answer_repo_chat_question

mcp = MCPServer(
    name="verisprint",
    title="VeriSprint",
    instructions=(
        "Query a VeriSprint workspace's Evidence Ledger — tickets, Confidence Scores, and evidence behind them — "
        "and ask the same Repo Chat questions the dashboard answers. Every tool call needs a workspace_token "
        "(Settings → MCP in the VeriSprint dashboard); calls with an invalid token return an error, never "
        "another workspace's data."
    ),
)


async def _workspace_for_token(token: str) -> Workspace:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Workspace).where(Workspace.mcp_token == token))
        workspace = result.scalar_one_or_none()
        if workspace is None:
            raise ValueError("Invalid or revoked workspace_token — generate one from Settings → MCP.")
        return workspace


@mcp.tool()
async def list_tickets(workspace_token: str, repo_full_name: str, status: str | None = None) -> list[dict]:
    """List tickets for one connected repo, with their current Confidence Score if computed.

    Args:
        workspace_token: The workspace's MCP bearer token (Settings → MCP).
        repo_full_name: The repo's "owner/name" as connected to VeriSprint, e.g. "acme/backend".
        status: Optional filter — one of todo, in_progress, in_review, done.
    """
    workspace = await _workspace_for_token(workspace_token)
    async with AsyncSessionLocal() as db:
        repo_result = await db.execute(
            select(Repo).where(Repo.workspace_id == workspace.id, Repo.full_name == repo_full_name)
        )
        repo = repo_result.scalar_one_or_none()
        if repo is None:
            raise ValueError(f"No repo named {repo_full_name!r} connected to this workspace.")

        stmt = select(Ticket).where(Ticket.repo_id == repo.id)
        if status:
            stmt = stmt.where(Ticket.status == status)
        tickets = (await db.execute(stmt.order_by(Ticket.key).limit(200))).scalars().all()

        out = []
        for ticket in tickets:
            score_row = (
                await db.execute(
                    select(ConfidenceScore)
                    .where(ConfidenceScore.ticket_id == ticket.id)
                    .order_by(ConfidenceScore.computed_at.desc())
                    .limit(1)
                )
            ).scalar_one_or_none()
            out.append(
                {
                    "key": ticket.key,
                    "title": ticket.title,
                    "status": ticket.status,
                    "assignee_github_login": ticket.assignee_github_login,
                    "confidence_score": score_row.score if score_row else None,
                    "confidence_rationale": score_row.rationale if score_row else None,
                }
            )
        return out


@mcp.tool()
async def get_ticket_evidence(workspace_token: str, repo_full_name: str, ticket_key: str) -> dict:
    """Get the full Evidence Ledger and Confidence Score for one ticket — every cited fact behind its score.

    Args:
        workspace_token: The workspace's MCP bearer token (Settings → MCP).
        repo_full_name: The repo's "owner/name" as connected to VeriSprint.
        ticket_key: The ticket key, e.g. "ENG-409".
    """
    workspace = await _workspace_for_token(workspace_token)
    async with AsyncSessionLocal() as db:
        repo_result = await db.execute(
            select(Repo).where(Repo.workspace_id == workspace.id, Repo.full_name == repo_full_name)
        )
        repo = repo_result.scalar_one_or_none()
        if repo is None:
            raise ValueError(f"No repo named {repo_full_name!r} connected to this workspace.")

        ticket_result = await db.execute(
            select(Ticket).where(Ticket.repo_id == repo.id, Ticket.key == ticket_key)
        )
        ticket = ticket_result.scalar_one_or_none()
        if ticket is None:
            raise ValueError(f"No ticket {ticket_key!r} found in {repo_full_name!r}.")

        score_row = (
            await db.execute(
                select(ConfidenceScore)
                .where(ConfidenceScore.ticket_id == ticket.id)
                .order_by(ConfidenceScore.computed_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        evidence_rows = (
            await db.execute(select(EvidenceItem).where(EvidenceItem.ticket_key == ticket_key))
        ).scalars().all()

        return {
            "key": ticket.key,
            "title": ticket.title,
            "status": ticket.status,
            "acceptance_criteria": ticket.acceptance_criteria,
            "confidence_score": score_row.score if score_row else None,
            "confidence_rationale": score_row.rationale if score_row else None,
            "evidence": [
                {"kind": e.kind.value, "description": e.description, "file_path": e.file_path} for e in evidence_rows
            ],
        }


@mcp.tool()
async def ask_repo_chat(workspace_token: str, repo_full_name: str, question: str) -> dict:
    """Ask a plain-English question about a repo's real activity — the same AI Repo Chat the dashboard offers,
    answered with citations back to real commits and PRs.

    Args:
        workspace_token: The workspace's MCP bearer token (Settings → MCP).
        repo_full_name: The repo's "owner/name" as connected to VeriSprint.
        question: A plain question, e.g. "did we ship the checkout redesign this week?"
    """
    workspace = await _workspace_for_token(workspace_token)
    async with AsyncSessionLocal() as db:
        repo_result = await db.execute(
            select(Repo).where(Repo.workspace_id == workspace.id, Repo.full_name == repo_full_name)
        )
        repo = repo_result.scalar_one_or_none()
        if repo is None:
            raise ValueError(f"No repo named {repo_full_name!r} connected to this workspace.")

    answer = await answer_repo_chat_question(repo.id, question, asked_by="mcp")
    return {
        "answer": answer.answer,
        "citations": [{"file_path": c.file_path, "description": c.description} for c in answer.citations],
    }


mcp_app = mcp.streamable_http_app(streamable_http_path="/mcp", stateless_http=True)
