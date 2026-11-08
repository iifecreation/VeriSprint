"""hash stored SCIM and MCP bearer tokens

Tokens are now stored as SHA-256 hex digests (see
app.auth.security.hash_api_token), so a database leak doesn't expose usable
tokens. Existing plaintext tokens are hashed in place; integrations keep
working because they still send the original token, which hashes to the
stored value.

This is one-way: downgrading can't recover the original tokens, so it leaves
the hashes in place (rotate the tokens after a downgrade).

Revision ID: b7e3d1a9c4f2
Revises: a1c4e2f9b7d3
Create Date: 2026-11-08
"""
from collections.abc import Sequence

from alembic import op

revision: str = "b7e3d1a9c4f2"
down_revision: str | None = "a1c4e2f9b7d3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # A 64-char lowercase hex value is already a digest — skip it so this is safe to re-run.
    op.execute(
        "UPDATE workspaces SET mcp_token = encode(sha256(convert_to(mcp_token, 'UTF8')), 'hex') "
        "WHERE mcp_token IS NOT NULL AND mcp_token !~ '^[0-9a-f]{64}$'"
    )
    op.execute(
        "UPDATE workspace_sso_configs SET scim_token = encode(sha256(convert_to(scim_token, 'UTF8')), 'hex') "
        "WHERE scim_token IS NOT NULL AND scim_token !~ '^[0-9a-f]{64}$'"
    )


def downgrade() -> None:
    pass
