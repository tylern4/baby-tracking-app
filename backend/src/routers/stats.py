from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..aggregate import aggregate_days
from ..auth import get_current_user
from ..database import get_db
from ..models import Entry, User
from ..schemas import StatsOut

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsOut)
def get_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    from_: date = Query(alias="from"),
    to: date = Query(...),
    tz_offset: int = Query(ge=-840, le=840, description="Minutes from UTC: new Date().getTimezoneOffset()"),
):
    if to < from_:
        from_, to = to, from_
    offset = timedelta(minutes=tz_offset)
    start = datetime.combine(from_, time.min, tzinfo=timezone.utc) + offset
    end = datetime.combine(to + timedelta(days=1), time.min, tzinfo=timezone.utc) + offset

    query = select(Entry).where(
        Entry.started_at >= start,
        Entry.started_at < end,
    )
    days = aggregate_days(db.scalars(query), tz_offset)
    return StatsOut(start=from_.isoformat(), end=to.isoformat(), days=days)
