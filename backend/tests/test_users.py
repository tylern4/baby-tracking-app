def test_list_users_requires_admin(client, register_user, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    register_user(email="bob@example.com")
    client.post("/api/users/2/approve", headers=headers)
    res = client.get("/api/users", headers=auth_headers("bob@example.com"))
    assert res.status_code == 403


def test_admin_lists_users(client, register_user, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    register_user(email="bob@example.com")
    res = client.get("/api/users", headers=headers)
    assert res.status_code == 200
    emails = {u["email"] for u in res.json()}
    assert emails == {"admin@example.com", "bob@example.com"}


def test_approve_user(client, register_user, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    register_user(email="bob@example.com")
    res = client.post("/api/users/2/approve", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "active"


def test_deny_user_and_cannot_deny_self(client, register_user, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    register_user(email="bob@example.com")
    res = client.post("/api/users/2/deny", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "denied"
    assert client.post("/api/users/1/deny", headers=headers).status_code == 400


def test_change_role(client, register_user, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    register_user(email="bob@example.com")
    res = client.patch("/api/users/2/role", json={"role": "read_only"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["role"] == "read_only"


def test_cannot_demote_last_admin(client, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    res = client.patch("/api/users/1/role", json={"role": "user"}, headers=headers)
    assert res.status_code == 400


def test_delete_user_keeps_entries(client, register_user, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    register_user(email="bob@example.com")
    client.post("/api/users/2/approve", headers=headers)

    bob_headers = auth_headers("bob@example.com")
    created = client.post(
        "/api/entries",
        json={"type": "feed", "started_at": "2026-01-01T08:00:00+00:00", "details": {}},
        headers=bob_headers,
    ).json()
    assert created["user_id"] == 2

    assert client.delete("/api/users/2", headers=headers).status_code == 204

    entries = client.get("/api/entries", headers=headers).json()
    assert len(entries) == 1
    assert entries[0]["id"] == created["id"]
    assert entries[0]["user_id"] is None


def test_delete_user_cannot_delete_self(client, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    assert client.delete("/api/users/1", headers=headers).status_code == 400


def test_admin_reset_password(client, register_user, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    register_user(email="bob@example.com")
    client.post("/api/users/2/approve", headers=headers)
    res = client.post(
        "/api/users/2/reset-password",
        json={"password": "newpass123"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["email"] == "bob@example.com"
    login = client.post(
        "/api/auth/login",
        json={"email": "bob@example.com", "password": "newpass123"},
    )
    assert login.status_code == 200


def test_admin_reset_password_old_fails(client, register_user, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    register_user(email="bob@example.com")
    client.post("/api/users/2/approve", headers=headers)
    client.post(
        "/api/users/2/reset-password",
        json={"password": "newpass123"},
        headers=headers,
    )
    login = client.post(
        "/api/auth/login",
        json={"email": "bob@example.com", "password": "password123"},
    )
    assert login.status_code == 401


def test_admin_reset_own_password(client, register_user, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    res = client.post(
        "/api/users/1/reset-password",
        json={"password": "adminnew123"},
        headers=headers,
    )
    assert res.status_code == 200
    login = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "adminnew123"},
    )
    assert login.status_code == 200


def test_non_admin_cannot_reset_password(client, register_user, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    register_user(email="bob@example.com")
    client.post("/api/users/2/approve", headers=headers)
    bob_headers = auth_headers("bob@example.com")
    res = client.post(
        "/api/users/1/reset-password",
        json={"password": "sneakypass1"},
        headers=bob_headers,
    )
    assert res.status_code == 403


def test_reset_password_rejects_short_password(client, register_user, admin, auth_headers):
    headers = auth_headers("admin@example.com")
    register_user(email="bob@example.com")
    res = client.post(
        "/api/users/2/reset-password",
        json={"password": "short"},
        headers=headers,
    )
    assert res.status_code == 422
