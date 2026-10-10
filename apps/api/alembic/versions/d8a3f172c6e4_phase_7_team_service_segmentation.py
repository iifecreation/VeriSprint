"""phase 7 team and service segmentation: teams, services, repos.service_id

Revision ID: d8a3f172c6e4
Revises: c4f91e6b2a85
Create Date: 2026-10-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd8a3f172c6e4'
down_revision: Union[str, None] = 'c4f91e6b2a85'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('services',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('workspace_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_services_workspace_id'), 'services', ['workspace_id'], unique=False)

    op.create_table('teams',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('workspace_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('member_github_logins', sa.JSON(), nullable=False, server_default='[]'),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_teams_workspace_id'), 'teams', ['workspace_id'], unique=False)

    op.add_column('repos', sa.Column('service_id', sa.UUID(), nullable=True))
    op.create_index(op.f('ix_repos_service_id'), 'repos', ['service_id'], unique=False)
    op.create_foreign_key('fk_repos_service_id_services', 'repos', 'services', ['service_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_repos_service_id_services', 'repos', type_='foreignkey')
    op.drop_index(op.f('ix_repos_service_id'), table_name='repos')
    op.drop_column('repos', 'service_id')

    op.drop_index(op.f('ix_teams_workspace_id'), table_name='teams')
    op.drop_table('teams')

    op.drop_index(op.f('ix_services_workspace_id'), table_name='services')
    op.drop_table('services')
