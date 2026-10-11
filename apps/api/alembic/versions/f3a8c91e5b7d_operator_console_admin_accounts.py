"""operator console: separate admin_accounts table + auth, decoupled from users

Revision ID: f3a8c91e5b7d
Revises: d8a3f172c6e4
Create Date: 2026-10-10 23:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f3a8c91e5b7d'
down_revision: Union[str, None] = 'd8a3f172c6e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('admin_accounts',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=True),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
    sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email'),
    )
    op.create_index(op.f('ix_admin_accounts_email'), 'admin_accounts', ['email'], unique=True)

    # Carry forward any existing super_admin `users` rows into the new,
    # separate admin_accounts table — same password_hash (no forced-reset
    # email flow exists yet to build one here; these are internal operator
    # accounts, not customer credentials), so existing operators keep working
    # against the new /admin/auth/login without being locked out.
    # Postgres stores this enum's *member names* (SUPER_ADMIN), not the
    # lowercase Python `.value` — see UserRole in app/db/models.py.
    op.execute("""
        INSERT INTO admin_accounts (id, email, name, password_hash, token_version, last_login_at, is_active, created_at)
        SELECT gen_random_uuid(), email, name, password_hash, 0, last_login_at, true, created_at
        FROM users
        WHERE role = 'SUPER_ADMIN' AND email IS NOT NULL AND password_hash IS NOT NULL
    """)

    # The old `users` rows are left in place (not deleted) so historical
    # audit_log_entries.actor_user_id / other FK references stay intact —
    # just stripped of the ability to authenticate: no code path honors
    # role == 'super_admin' any more (see UserRole's docstring), and nulling
    # password_hash + bumping token_version means even a still-outstanding
    # access token or the email/password login path can't be used to act as
    # them again.
    op.execute("""
        UPDATE users
        SET password_hash = NULL, token_version = token_version + 1000
        WHERE role = 'SUPER_ADMIN'
    """)


def downgrade() -> None:
    op.drop_index(op.f('ix_admin_accounts_email'), table_name='admin_accounts')
    op.drop_table('admin_accounts')
