def test_stats_aggregates_range(client, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    client.post(
        "/api/entries",
        json={
            "type": "feed",
            "started_at": "2026-01-02T10:00:00+00:00",
            "details": {"amount_ml": 120},
        },
        headers=headers,
    )
    client.post(
        "/api/entries",
        json={
            "type": "diaper",
            "started_at": "2026-01-03T10:00:00+00:00",
            "details": {"wet": True},
        },
        headers=headers,
    )

    res = client.get(
        "/api/stats",
        params={"from": "2026-01-01", "to": "2026-01-07", "tz_offset": 0},
        headers=headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["start"] == "2026-01-01"
    assert body["end"] == "2026-01-07"
    assert body["days"]["2026-01-02"]["feeds"] == 1
    assert body["days"]["2026-01-03"]["diapers"] == 1


def test_stats_swaps_reversed_range(client, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    client.post(
        "/api/entries",
        json={"type": "feed", "started_at": "2026-01-02T10:00:00+00:00", "details": {}},
        headers=headers,
    )
    res = client.get(
        "/api/stats",
        params={"from": "2026-01-07", "to": "2026-01-01", "tz_offset": 0},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["days"]["2026-01-02"]["feeds"] == 1


def test_stats_buckets_by_local_day_with_offset(client, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    client.post(
        "/api/entries",
        json={"type": "feed", "started_at": "2026-01-01T23:30:00+00:00", "details": {}},
        headers=headers,
    )
    res = client.get(
        "/api/stats",
        params={"from": "2026-01-01", "to": "2026-01-02", "tz_offset": -60},
        headers=headers,
    )
    # 23:30 UTC + 1h lands on Jan 2 local time
    assert res.json()["days"]["2026-01-02"]["feeds"] == 1


def test_stats_requires_auth(client):
    res = client.get(
        "/api/stats",
        params={"from": "2026-01-01", "to": "2026-01-07", "tz_offset": 0},
    )
    assert res.status_code == 401
