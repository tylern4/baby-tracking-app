FEED = {
    "type": "feed",
    "started_at": "2026-01-01T08:00:00+00:00",
    "details": {"amount_ml": 120, "duration_min": 15, "method": "bottle"},
    "note": "morning bottle",
}


def test_create_feed_entry(client, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    res = client.post("/api/entries", json=FEED, headers=headers)
    assert res.status_code == 201
    body = res.json()
    assert body["type"] == "feed"
    assert body["user_id"] == admin["id"]
    assert body["details"]["amount_ml"] == 120
    assert body["note"] == "morning bottle"


def test_create_requires_auth(client):
    assert client.post("/api/entries", json=FEED).status_code == 401


def test_create_rejects_end_before_start(client, admin, auth_headers):
    payload = {
        **FEED,
        "started_at": "2026-01-01T10:00:00+00:00",
        "ended_at": "2026-01-01T08:00:00+00:00",
    }
    res = client.post("/api/entries", json=payload, headers=auth_headers("admin@example.com"))
    assert res.status_code == 422


def test_create_sleep_entry(client, admin, auth_headers):
    payload = {
        "type": "sleep",
        "started_at": "2026-01-01T21:00:00+00:00",
        "ended_at": "2026-01-02T06:00:00+00:00",
    }
    res = client.post("/api/entries", json=payload, headers=auth_headers("admin@example.com"))
    assert res.status_code == 201
    assert res.json()["type"] == "sleep"


def test_create_diaper_entry(client, admin, auth_headers):
    payload = {
        "type": "diaper",
        "started_at": "2026-01-01T12:00:00+00:00",
        "details": {"wet": True, "color": "mustard"},
    }
    res = client.post("/api/entries", json=payload, headers=auth_headers("admin@example.com"))
    assert res.status_code == 201


def test_read_only_cannot_create(client, register_user, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    register_user(email="viewer@example.com")
    client.post("/api/users/2/approve", headers=headers)
    res = client.patch("/api/users/2/role", json={"role": "read_only"}, headers=headers)
    assert res.status_code == 200
    viewer_headers = auth_headers("viewer@example.com")
    assert client.post("/api/entries", json=FEED, headers=viewer_headers).status_code == 403


def test_list_entries_with_filters(client, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    client.post("/api/entries", json=FEED, headers=headers)
    client.post(
        "/api/entries",
        json={
            "type": "diaper",
            "started_at": "2026-01-05T12:00:00+00:00",
            "details": {},
        },
        headers=headers,
    )
    all_entries = client.get("/api/entries", headers=headers)
    assert all_entries.status_code == 200
    assert len(all_entries.json()) == 2

    feeds = client.get("/api/entries?type=feed", headers=headers)
    assert len(feeds.json()) == 1
    assert feeds.json()[0]["type"] == "feed"

    filtered = client.get(
        "/api/entries",
        params={"from": "2026-01-01T00:00:00+00:00", "to": "2026-01-02T00:00:00+00:00"},
        headers=headers,
    )
    assert len(filtered.json()) == 1


def test_list_requires_auth(client):
    assert client.get("/api/entries").status_code == 401


def test_update_entry(client, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    created = client.post("/api/entries", json=FEED, headers=headers).json()
    res = client.patch(
        f"/api/entries/{created['id']}",
        json={"note": "updated", "details": {"amount_ml": 150}},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["note"] == "updated"
    assert res.json()["details"]["amount_ml"] == 150


def test_update_entry_rejects_end_before_start(client, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    created = client.post("/api/entries", json=FEED, headers=headers).json()
    res = client.patch(
        f"/api/entries/{created['id']}",
        json={"ended_at": "2026-01-01T07:00:00+00:00"},
        headers=headers,
    )
    assert res.status_code == 422


def test_delete_entry(client, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    created = client.post("/api/entries", json=FEED, headers=headers).json()
    assert client.delete(f"/api/entries/{created['id']}", headers=headers).status_code == 204
    assert client.get("/api/entries", headers=headers).json() == []


def test_missing_entry_returns_404(client, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    assert client.patch("/api/entries/999", json={"note": "x"}, headers=headers).status_code == 404
    assert client.delete("/api/entries/999", headers=headers).status_code == 404
