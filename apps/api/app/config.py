"""
Centralized settings, loaded from environment variables / .env.

Mirrors the env vars called out in the build brief:
GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET, ANTHROPIC_API_KEY,
DATABASE_URL, VECTOR_DB_URL, SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET,
JIRA_API_TOKEN (optional), OBJECT_STORAGE_BUCKET.
"""
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App. Ports 58000/53000, not the usual 8000/3000 — this repo sits next to
    # other local projects on this machine that already hold those ports; see
    # docker-compose.yml for the same reasoning on the Postgres/Redis ports.
    env: str = Field(default="development", alias="ENV")
    api_base_url: str = Field(default="http://localhost:58000", alias="API_BASE_URL")
    web_base_url: str = Field(default="http://localhost:53000", alias="WEB_BASE_URL")
    # Separate frontend deploys (spec: admin console split from the product
    # app) — both need CORS + admin_base_url doubles as the SCIM/OIDC
    # audience-adjacent origin. marketing_base_url currently makes no
    # API-mutating calls but is allowed anyway so a future one doesn't
    # silently CORS-fail.
    admin_base_url: str = Field(default="http://localhost:53200", alias="ADMIN_BASE_URL")
    marketing_base_url: str = Field(default="http://localhost:53100", alias="MARKETING_BASE_URL")

    # Postgres (structured data). Port 55432, not 5432 — see docker-compose.yml.
    database_url: str = Field(
        default="postgresql+asyncpg://verisprint:verisprint@localhost:55432/verisprint",
        alias="DATABASE_URL",
    )

    # Vector DB (pgvector by default; can point at a managed vector DB instead)
    vector_db_url: str = Field(
        default="postgresql+asyncpg://verisprint:verisprint@localhost:55432/verisprint",
        alias="VECTOR_DB_URL",
    )

    # Queue (Redis-backed arq queue locally; swap for SQS in prod if preferred).
    # Port 56379, not 6379 — see docker-compose.yml.
    redis_url: str = Field(default="redis://localhost:56379/0", alias="REDIS_URL")

    # GitHub App
    github_app_id: str = Field(default="", alias="GITHUB_APP_ID")
    github_app_private_key: str = Field(default="", alias="GITHUB_APP_PRIVATE_KEY")
    github_webhook_secret: str = Field(default="", alias="GITHUB_WEBHOOK_SECRET")
    github_client_id: str = Field(default="", alias="GITHUB_CLIENT_ID")
    github_client_secret: str = Field(default="", alias="GITHUB_CLIENT_SECRET")

    # LLM — provider abstraction (Section 5.11: Private/On-Prem LLM Option).
    # "anthropic" (default) talks to the Claude API, optionally through a
    # private VPC endpoint / proxy via anthropic_base_url. "openai_compatible"
    # talks to a self-hosted server (vLLM, Ollama, LM Studio, text-generation-webui, ...)
    # that exposes an OpenAI-style /chat/completions endpoint, for customers who
    # can't send code to a third-party API. See app/integrations/llm_client.py.
    llm_provider: str = Field(default="anthropic", alias="LLM_PROVIDER")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(default="claude-opus-5", alias="ANTHROPIC_MODEL")
    anthropic_base_url: str = Field(default="", alias="ANTHROPIC_BASE_URL")
    on_prem_llm_base_url: str = Field(default="", alias="ON_PREM_LLM_BASE_URL")
    on_prem_llm_model: str = Field(default="", alias="ON_PREM_LLM_MODEL")
    on_prem_llm_api_key: str = Field(default="", alias="ON_PREM_LLM_API_KEY")

    # Slack
    slack_bot_token: str = Field(default="", alias="SLACK_BOT_TOKEN")
    slack_signing_secret: str = Field(default="", alias="SLACK_SIGNING_SECRET")

    # Email digests
    resend_api_key: str = Field(default="", alias="RESEND_API_KEY")

    # Ticket sync (optional for MVP demo; manual entry works without it)
    jira_api_token: str = Field(default="", alias="JIRA_API_TOKEN")
    jira_base_url: str = Field(default="", alias="JIRA_BASE_URL")
    linear_api_key: str = Field(default="", alias="LINEAR_API_KEY")

    # Object storage (raw diffs)
    object_storage_bucket: str = Field(default="", alias="OBJECT_STORAGE_BUCKET")
    aws_region: str = Field(default="us-east-1", alias="AWS_REGION")
    aws_access_key_id: str = Field(default="", alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str = Field(default="", alias="AWS_SECRET_ACCESS_KEY")

    # Auth (spec Section 6: JWT access + refresh, workspace_id embedded, RBAC)
    session_secret: str = Field(default="dev-secret-change-me", alias="SESSION_SECRET")
    jwt_secret: str = Field(default="dev-jwt-secret-change-me", alias="JWT_SECRET")
    jwt_issuer: str = Field(default="verisprint", alias="JWT_ISSUER")
    jwt_access_ttl_minutes: int = Field(default=15, alias="JWT_ACCESS_TTL_MINUTES")
    jwt_refresh_ttl_days: int = Field(default=30, alias="JWT_REFRESH_TTL_DAYS")
    # Where OAuth/SSO callbacks hand tokens to the SPA (URL fragment, never a query
    # string — fragments aren't sent to the server or logged in access logs).
    frontend_auth_callback_path: str = Field(default="/auth/callback", alias="FRONTEND_AUTH_CALLBACK_PATH")

    # SSO (Enterprise tier) — generic OIDC. Unset by default; GitHub OAuth
    # remains the primary login path until a customer's IdP is configured.
    oidc_issuer: str = Field(default="", alias="OIDC_ISSUER")
    oidc_client_id: str = Field(default="", alias="OIDC_CLIENT_ID")
    oidc_client_secret: str = Field(default="", alias="OIDC_CLIENT_SECRET")
    oidc_redirect_url: str = Field(default="", alias="OIDC_REDIRECT_URL")

    # Observability (spec Section 7): Sentry is optional — unset SENTRY_DSN
    # disables it entirely, and app/observability.py's ErrorEvent/SystemMetric
    # pipeline (the Super-Admin Dashboard's actual data source) runs either way.
    sentry_dsn: str = Field(default="", alias="SENTRY_DSN")
    sentry_traces_sample_rate: float = Field(default=0.1, alias="SENTRY_TRACES_SAMPLE_RATE")

    # Billing (spec Section 7) — Stripe Checkout + Customer Portal + webhooks.
    # Self-serve tiers only (team/growth/agency); ENTERPRISE is sales-assisted,
    # provisioned manually via the Super-Admin Dashboard, never through checkout.
    stripe_secret_key: str = Field(default="", alias="STRIPE_SECRET_KEY")
    stripe_publishable_key: str = Field(default="", alias="STRIPE_PUBLISHABLE_KEY")
    stripe_webhook_secret: str = Field(default="", alias="STRIPE_WEBHOOK_SECRET")
    stripe_price_id_team: str = Field(default="", alias="STRIPE_PRICE_ID_TEAM")
    stripe_price_id_growth: str = Field(default="", alias="STRIPE_PRICE_ID_GROWTH")
    stripe_price_id_agency: str = Field(default="", alias="STRIPE_PRICE_ID_AGENCY")


@lru_cache
def get_settings() -> Settings:
    return Settings()
