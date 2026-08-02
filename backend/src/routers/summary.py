from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..aggregate import aggregate_days
from ..auth import get_current_user
from ..database import get_db
from ..models import Entry, User
from ..schemas import MonthSummary

router = APIRouter(prefix="/summary", tags=["summary"])


def _month_bounds(year: int, month: int, tz_offset_minutes: int) -> tuple[datetime, datetime]:
    """Return UTC datetimes for the local start and end of the month."""
    offset = timedelta(minutes=tz_offset_minutes)
    local_start = datetime(year, month, 1, tzinfo=timezone.utc)
    next_year, next_month = (year + 1, 1) if month == 12 else (year, month + 1)
    local_end = datetime(next_year, next_month, 1, tzinfo=timezone.utc)
    return local_start + offset, local_end + offset


@router.get("", response_model=MonthSummary)
def month_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
    tz_offset: int = Query(ge=-840, le=840, description="Minutes from UTC: new Date().getTimezoneOffset()"),
):
    start, end = _month_bounds(year, month, tz_offset)
    query = select(Entry).where(
        Entry.started_at >= start,
        Entry.started_at < end,
    )
    days = aggregate_days(db.scalars(query), tz_offset)
    return MonthSummary(month=f"{year:04d}-{month:02d}", days=days)
