from datetime import date, datetime, timedelta, timezone

from .models import Entry
from .schemas import DaySummary


def local_day(utc_dt: datetime, tz_offset_minutes: int) -> date:
    """Local calendar day for a UTC datetime."""
    return (utc_dt - timedelta(minutes=tz_offset_minutes)).date()


def aggregate_days(entries, tz_offset_minutes: int) -> dict[str, DaySummary]:
    """Aggregate entries into per-day DaySummary buckets keyed by ISO date."""
    days: dict[str, DaySummary] = {}
    now = datetime.now(timezone.utc)

    for entry in entries:
        day = local_day(entry.started_at, tz_offset_minutes).isoformat()
        summary = days.setdefault(day, DaySummary())
        details = entry.details or {}

        if entry.type == "feed":
            summary.feeds += 1
            summary.feed_ml += float(details.get("amount_ml") or 0)
            summary.feed_minutes += float(details.get("duration_min") or 0)
        elif entry.type == "sleep":
            summary.sleeps += 1
            end = entry.ended_at or now
            minutes = (end - entry.started_at).total_seconds() / 60
            summary.sleep_minutes += max(0, minutes)
        elif entry.type == "diaper":
            summary.diapers += 1
            if details.get("wet"):
                summary.wet += 1
            if details.get("dirty"):
                summary.dirty += 1

    return days
