"""phase 4 pr workflow automation: policy bookkeeping fields on pull_requests

Revision ID: c4f91e6b2a85
Revises: b7e2d84a9f13
Create Date: 2026-10-10 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4f91e6b2a85'
down_revision: Union[str, None] = 'b7e2d84a9f13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('pull_requests', sa.Column('policy_labels_applied', sa.JSON(), nullable=False, server_default='[]'))
    op.add_column('pull_requests', sa.Column('policy_reviewers_requested', sa.JSON(), nullable=False, server_default='[]'))
    op.add_column('pull_requests', sa.Column('policy_auto_approved_sha', sa.String(length=40), nullable=True))


def downgrade() -> None:
    op.drop_column('pull_requests', 'policy_auto_approved_sha')
    op.drop_column('pull_requests', 'policy_reviewers_requested')
    op.drop_column('pull_requests', 'policy_labels_applied')
