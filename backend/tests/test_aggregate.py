from datetime import datetime, timezone

from src.aggregate import aggregate_days, local_day
from src.models import Entry


def _entry(type_, started_at, ended_at=None, details=None):
    return Entry(type=type_, started_at=started_at, ended_at=ended_at, details=details or {})


def test_local_day_with_offset():
    dt = datetime(2026, 1, 1, 23, 30, tzinfo=timezone.utc)
    assert local_day(dt, 0).isoformat() == "2026-01-01"
    assert local_day(dt, -60).isoformat() == "2026-01-02"
    assert local_day(dt, 120).isoformat() == "2026-01-01"


def test_aggregate_empty():
    assert aggregate_days([], 0) == {}


def test_aggregate_feed():
    e = _entry(
        "feed",
        datetime(2026, 1, 1, 8, 0, tzinfo=timezone.utc),
        details={"amount_ml": 120, "duration_min": 15},
    )
    day = aggregate_days([e], 0)["2026-01-01"]
    assert day.feeds == 1
    assert day.feed_ml == 120
    assert day.feed_minutes == 15


def test_aggregate_sleep_minutes():
    start = datetime(2026, 1, 1, 21, 0, tzinfo=timezone.utc)
    end = datetime(2026, 1, 2, 5, 0, tzinfo=timezone.utc)
    day = aggregate_days([_entry("sleep", start, ended_at=end)], 0)["2026-01-01"]
    assert day.sleeps == 1
    assert day.sleep_minutes == 480


def test_aggregate_diaper_flags():
    e = _entry(
        "diaper",
        datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc),
        details={"wet": True, "dirty": True},
    )
    day = aggregate_days([e], 0)["2026-01-01"]
    assert day.diapers == 1
    assert day.wet == 1
    assert day.dirty == 1


def test_aggregate_buckets_separate_days():
    entries = [
        _entry("feed", datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc), details={}),
        _entry("feed", datetime(2026, 1, 2, 10, 0, tzinfo=timezone.utc), details={}),
    ]
    days = aggregate_days(entries, 0)
    assert days["2026-01-01"].feeds == 1
    assert days["2026-01-02"].feeds == 1
