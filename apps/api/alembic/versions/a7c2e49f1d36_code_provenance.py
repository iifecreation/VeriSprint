"""code provenance: commit line-breakdown columns + code_line_fingerprints

Revision ID: a7c2e49f1d36
Revises: f3a8c91e5b7d
Create Date: 2026-10-11 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7c2e49f1d36'
down_revision: Union[str, None] = 'f3a8c91e5b7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('commits', sa.Column('original_engineering_lines', sa.Integer(), nullable=True))
    op.add_column('commits', sa.Column('ai_disclosed_lines', sa.Integer(), nullable=True))
    op.add_column('commits', sa.Column('duplicate_or_boilerplate_lines', sa.Integer(), nullable=True))

    op.create_table('code_line_fingerprints',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('repo_id', sa.UUID(), nullable=False),
    sa.Column('line_hash', sa.String(length=64), nullable=False),
    sa.Column('first_seen_commit_id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['repo_id'], ['repos.id'], ),
    sa.ForeignKeyConstraint(['first_seen_commit_id'], ['commits.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('repo_id', 'line_hash'),
    )
    op.create_index(op.f('ix_code_line_fingerprints_repo_id'), 'code_line_fingerprints', ['repo_id'], unique=False)
    op.create_index(op.f('ix_code_line_fingerprints_line_hash'), 'code_line_fingerprints', ['line_hash'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_code_line_fingerprints_line_hash'), table_name='code_line_fingerprints')
    op.drop_index(op.f('ix_code_line_fingerprints_repo_id'), table_name='code_line_fingerprints')
    op.drop_table('code_line_fingerprints')

    op.drop_column('commits', 'duplicate_or_boilerplate_lines')
    op.drop_column('commits', 'ai_disclosed_lines')
    op.drop_column('commits', 'original_engineering_lines')
