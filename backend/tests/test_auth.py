from src.config import settings


def test_register_first_user_creates_active_admin(client, register_user):
    res = register_user(email="admin@example.com", invite_code=settings.invite_code)
    assert res.status_code == 201
    body = res.json()
    assert body["user"]["role"] == "admin"
    assert body["user"]["status"] == "active"
    assert body["access_token"]


def test_register_first_user_requires_invite_code(client, register_user):
    res = register_user(email="admin@example.com")
    assert res.status_code == 403


def test_register_second_user_is_pending(client, register_user, admin):
    res = register_user(email="bob@example.com")
    assert res.status_code == 201
    body = res.json()
    assert body["user"]["role"] == "user"
    assert body["user"]["status"] == "pending"
    assert body["access_token"] is None


def test_register_duplicate_email_conflicts(client, register_user, admin):
    assert register_user(email="bob@example.com").status_code == 201
    assert register_user(email="bob@example.com").status_code == 409


def test_register_rejects_short_password(client, register_user):
    assert register_user(password="short").status_code == 422


def test_login_success(client, register_user, admin):
    res = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"]
    assert body["user"]["email"] == "admin@example.com"


def test_login_wrong_password(client, register_user, admin):
    res = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "wrongpass1"},
    )
    assert res.status_code == 401


def test_login_pending_user_forbidden(client, register_user, admin):
    register_user(email="bob@example.com")
    res = client.post(
        "/api/auth/login",
        json={"email": "bob@example.com", "password": "password123"},
    )
    assert res.status_code == 403


def test_login_denied_user_forbidden(client, register_user, admin, auth_headers):
    register_user(email="bob@example.com")
    headers = auth_headers("admin@example.com")
    assert client.post("/api/users/2/deny", headers=headers).status_code == 200
    res = client.post(
        "/api/auth/login",
        json={"email": "bob@example.com", "password": "password123"},
    )
    assert res.status_code == 403


def test_me_requires_auth(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_with_token(client, register_user, admin, auth_headers):
    res = client.get("/api/auth/me", headers=auth_headers("admin@example.com"))
    assert res.status_code == 200
    assert res.json()["email"] == "admin@example.com"


def test_me_rejects_bad_token(client, register_user, admin):
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-token"})
    assert res.status_code == 401
