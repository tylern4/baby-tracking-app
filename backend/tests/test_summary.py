def test_month_summary_aggregates_days(client, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    client.post(
        "/api/entries",
        json={
            "type": "feed",
            "started_at": "2026-01-05T10:00:00+00:00",
            "details": {"amount_ml": 120},
        },
        headers=headers,
    )
    client.post(
        "/api/entries",
        json={
            "type": "feed",
            "started_at": "2026-01-05T14:00:00+00:00",
            "details": {"amount_ml": 90},
        },
        headers=headers,
    )
    client.post(
        "/api/entries",
        json={
            "type": "sleep",
            "started_at": "2026-01-05T21:00:00+00:00",
            "ended_at": "2026-01-06T05:00:00+00:00",
        },
        headers=headers,
    )
    client.post(
        "/api/entries",
        json={
            "type": "diaper",
            "started_at": "2026-01-06T09:00:00+00:00",
            "details": {"wet": True, "dirty": True},
        },
        headers=headers,
    )

    res = client.get(
        "/api/summary",
        params={"year": 2026, "month": 1, "tz_offset": 0},
        headers=headers,
    )
    assert res.status_code == 200
    days = res.json()["days"]

    day5 = days["2026-01-05"]
    assert day5["feeds"] == 2
    assert day5["feed_ml"] == 210
    assert day5["sleeps"] == 1
    assert day5["sleep_minutes"] == 480

    day6 = days["2026-01-06"]
    assert day6["diapers"] == 1
    assert day6["wet"] == 1
    assert day6["dirty"] == 1


def test_month_summary_respects_tz_offset(client, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    client.post(
        "/api/entries",
        json={"type": "feed", "started_at": "2026-01-31T23:30:00+00:00", "details": {}},
        headers=headers,
    )
    feb = client.get(
        "/api/summary",
        params={"year": 2026, "month": 2, "tz_offset": -60},
        headers=headers,
    )
    # 23:30 UTC + 1h lands on Feb 1 local time
    assert feb.json()["days"]["2026-02-01"]["feeds"] == 1

    jan = client.get(
        "/api/summary",
        params={"year": 2026, "month": 1, "tz_offset": -60},
        headers=headers,
    )
    assert "2026-01-31" not in jan.json()["days"] or jan.json()["days"]["2026-01-31"]["feeds"] == 0


def test_month_summary_requires_auth(client):
    res = client.get("/api/summary", params={"year": 2026, "month": 1, "tz_offset": 0})
    assert res.status_code == 401
