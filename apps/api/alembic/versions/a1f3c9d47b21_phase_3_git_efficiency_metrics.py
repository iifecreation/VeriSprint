"""phase 3 git efficiency metrics: pr size/review fields, pull_request_reviews, deployments

Revision ID: a1f3c9d47b21
Revises: 38890830311f
Create Date: 2026-10-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1f3c9d47b21'
down_revision: Union[str, None] = '38890830311f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('pull_requests', sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('pull_requests', sa.Column('additions', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('pull_requests', sa.Column('deletions', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('pull_requests', sa.Column('changed_files', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('pull_requests', sa.Column('first_review_requested_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('pull_requests', sa.Column('merge_commit_sha', sa.String(length=40), nullable=True))

    op.add_column('commits', sa.Column('touched_file_paths', sa.JSON(), nullable=False, server_default='[]'))

    op.create_table('pull_request_reviews',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('pull_request_id', sa.UUID(), nullable=False),
    sa.Column('github_review_id', sa.Integer(), nullable=False),
    sa.Column('reviewer_github_login', sa.String(length=255), nullable=False),
    sa.Column('state', sa.String(length=32), nullable=False),
    sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['pull_request_id'], ['pull_requests.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('pull_request_id', 'github_review_id')
    )
    op.create_index(op.f('ix_pull_request_reviews_pull_request_id'), 'pull_request_reviews', ['pull_request_id'], unique=False)

    op.create_table('deployments',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('repo_id', sa.UUID(), nullable=False),
    sa.Column('github_deployment_id', sa.Integer(), nullable=False),
    sa.Column('environment', sa.String(length=128), nullable=False, server_default='production'),
    sa.Column('sha', sa.String(length=40), nullable=False),
    sa.Column('state', sa.String(length=32), nullable=False, server_default='pending'),
    sa.Column('created_at_gh', sa.DateTime(timezone=True), nullable=False),
    sa.Column('resolved_at_gh', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['repo_id'], ['repos.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('repo_id', 'github_deployment_id')
    )
    op.create_index(op.f('ix_deployments_repo_id'), 'deployments', ['repo_id'], unique=False)
    op.create_index(op.f('ix_deployments_sha'), 'deployments', ['sha'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_deployments_sha'), table_name='deployments')
    op.drop_index(op.f('ix_deployments_repo_id'), table_name='deployments')
    op.drop_table('deployments')
    op.drop_index(op.f('ix_pull_request_reviews_pull_request_id'), table_name='pull_request_reviews')
    op.drop_table('pull_request_reviews')
    op.drop_column('commits', 'touched_file_paths')
    op.drop_column('pull_requests', 'merge_commit_sha')
    op.drop_column('pull_requests', 'first_review_requested_at')
    op.drop_column('pull_requests', 'changed_files')
    op.drop_column('pull_requests', 'deletions')
    op.drop_column('pull_requests', 'additions')
    op.drop_column('pull_requests', 'closed_at')
