"""seed every feature flag key the code checks

A fresh deployment had no FeatureFlag rows, so an operator had to type each
internal key from memory in the Operator Console (and a typo silently did
nothing). This inserts one row per key the routers actually gate on — all
disabled, so behavior is unchanged until an operator turns one on. Rows that
already exist are left alone.

Revision ID: a1c4e2f9b7d3
Revises: 38890830311f
Create Date: 2026-10-23
"""
import uuid
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a1c4e2f9b7d3"
down_revision: str | None = "38890830311f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

KNOWN_FLAGS = {
    "dora_panel": "DORA metrics panel (Insights)",
    "code_health_signals": "Code health signals (Insights)",
    "risk_radar": "Risk Radar (Insights)",
    "team_goals": "Team goals & targets (Insights)",
    "value_stream_view": "Value stream view (Analytics)",
    "cost_capitalization": "Cost capitalization report (Analytics)",
    "investment_allocation": "Investment allocation (Analytics)",
    "visual_changelog": "Visual changelog (Analytics)",
    "ai_contribution_tracker": "AI contribution tracker (Analytics)",
    "ai_tool_cost_tracking": "AI tool cost tracking (Analytics)",
    "delivery_forecast": "Delivery forecast (Sprints)",
    "pr_autoroute": "PR AutoRoute reviewer suggestions (Reviewers)",
    "pulse_surveys": "Pulse surveys & working agreements (Team)",
    "open_integration_framework": "Open integration framework (Settings)",
    "workspace_sso": "Per-workspace SSO/SCIM config (Settings)",
}


def upgrade() -> None:
    conn = op.get_bind()
    existing = {row[0] for row in conn.execute(sa.text("SELECT key FROM feature_flags"))}
    for key, description in KNOWN_FLAGS.items():
        if key in existing:
            continue
        conn.execute(
            sa.text(
                "INSERT INTO feature_flags (id, key, description, enabled_globally, enabled_workspace_ids) "
                "VALUES (:id, :key, :description, false, CAST('[]' AS json))"
            ),
            {"id": uuid.uuid4(), "key": key, "description": description},
        )


def downgrade() -> None:
    # Only remove seeded rows nobody has turned on, so an operator's real
    # rollout choices survive a downgrade.
    conn = op.get_bind()
    for key in KNOWN_FLAGS:
        conn.execute(
            sa.text(
                "DELETE FROM feature_flags WHERE key = :key AND enabled_globally = false "
                "AND CAST(enabled_workspace_ids AS text) = '[]' AND min_plan_tier IS NULL"
            ),
            {"key": key},
        )
