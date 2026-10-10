"""phase 3 okr cascade + goal alerts: parent_goal_id, last_alert_sent_at on team_goals

Revision ID: b7e2d84a9f13
Revises: a1f3c9d47b21
Create Date: 2026-10-10 06:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7e2d84a9f13'
down_revision: Union[str, None] = 'a1f3c9d47b21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('team_goals', sa.Column('parent_goal_id', sa.UUID(), nullable=True))
    op.add_column('team_goals', sa.Column('last_alert_sent_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_team_goals_parent_goal_id'), 'team_goals', ['parent_goal_id'], unique=False)
    op.create_foreign_key(
        'fk_team_goals_parent_goal_id_team_goals', 'team_goals', 'team_goals', ['parent_goal_id'], ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_team_goals_parent_goal_id_team_goals', 'team_goals', type_='foreignkey')
    op.drop_index(op.f('ix_team_goals_parent_goal_id'), table_name='team_goals')
    op.drop_column('team_goals', 'last_alert_sent_at')
    op.drop_column('team_goals', 'parent_goal_id')
