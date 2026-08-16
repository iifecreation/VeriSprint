from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Shared declarative base for all ORM models.

    Maps every `Mapped[datetime]` column to a timezone-aware Postgres
    TIMESTAMPTZ. Every datetime the application constructs (webhook
    timestamps, `datetime.now(timezone.utc)`, FastAPI-parsed ISO query
    params) is already tz-aware — a naive `TIMESTAMP` column would silently
    mismatch and asyncpg would raise on comparison, so this is not optional.
    """

    type_annotation_map = {datetime: DateTime(timezone=True)}
