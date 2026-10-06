"""Tests for the authentication API. They need a running MongoDB (see MONGO_URI)."""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
import pytest
from bson import ObjectId

from app import create_app
from tests.conftest import TEST_CONFIG

PASSWORD = "Harbor#2026"
VALID = {
    "email": "dana.ruiz@example.com",
    "username": "dana.ruiz",
    "password": PASSWORD,
    "confirm_password": PASSWORD,
}
COOKIE = "access_token"


def register(client, **changes):
    return client.post("/api/register", json={**VALID, **changes})


def login(client, identifier="dana.ruiz", password=PASSWORD):
    return client.post("/api/login", json={"identifier": identifier, "password": password})


def set_cookie_header(response):
    """The Set-Cookie header for the login cookie, or '' if there is none."""
    return next((h for h in response.headers.getlist("Set-Cookie") if h.startswith(COOKIE + "=")), "")


def token_from(response):
    return set_cookie_header(response).split(";")[0].split("=", 1)[1]


# ---- REGISTRATION ----------------------------------------------------------

def test_register_creates_account(client, users):
    response = register(client)
    body = response.get_json()

    assert response.status_code == 201
    assert body["success"] is True
    assert body["data"]["user"]["email"] == "dana.ruiz@example.com"
    assert body["data"]["user"]["username"] == "dana.ruiz"
    assert users.count_documents({}) == 1


def test_register_does_not_log_the_user_in(client):
    response = register(client)
    assert set_cookie_header(response) == ""
    assert client.get("/api/dashboard").status_code == 401


def test_password_is_stored_only_as_a_bcrypt_hash(client, users):
    register(client)
    stored = users.find_one({"email": "dana.ruiz@example.com"})

    assert set(stored) == {"_id", "email", "username", "password_hash", "created_at"}
    assert stored["password_hash"].startswith("$2b$")
    assert PASSWORD not in str(stored)
    assert bcrypt.checkpw(PASSWORD.encode(), stored["password_hash"].encode())
    assert not bcrypt.checkpw(b"WrongPassword#1", stored["password_hash"].encode())


def test_same_password_gives_different_hashes(client, users):
    register(client)
    register(client, email="other@example.com", username="other.user")
    first, second = [user["password_hash"] for user in users.find()]
    assert first != second  # each hash has its own random salt


def test_password_never_appears_in_any_response(client):
    responses = [register(client), login(client), client.get("/api/dashboard"), client.post("/api/logout")]
    for response in responses:
        text = response.get_data(as_text=True)
        assert PASSWORD not in text
        assert "password_hash" not in text
        assert "$2b$" not in text


def test_register_cleans_email_and_username(client, users):
    register(client, email="  Dana.Ruiz@Example.COM ", username="  dana.ruiz  ")
    stored = users.find_one()
    assert stored["email"] == "dana.ruiz@example.com"
    assert stored["username"] == "dana.ruiz"


def test_register_ignores_unknown_fields(client, users):
    register(client, is_admin=True, password_hash="injected", _id="abc")
    stored = users.find_one()
    assert "is_admin" not in stored
    assert stored["password_hash"].startswith("$2b$")


def test_duplicate_email_is_rejected(client, users):
    register(client)
    response = register(client, username="someone.else", email="DANA.RUIZ@example.com")
    body = response.get_json()

    assert response.status_code == 409
    assert body["errors"] == {"email": "An account with this email already exists. Log in instead."}
    assert users.count_documents({}) == 1


def test_duplicate_username_is_rejected_ignoring_case(client, users):
    register(client)
    response = register(client, email="someone.else@example.com", username="Dana.Ruiz")
    body = response.get_json()

    assert response.status_code == 409
    assert body["errors"] == {"username": "This username is taken. Try another."}
    assert users.count_documents({}) == 1


def test_duplicate_email_and_username_are_both_reported(client):
    register(client)
    body = register(client).get_json()
    assert set(body["errors"]) == {"email", "username"}


def test_database_index_blocks_duplicates_even_without_the_app_check(users):
    from pymongo.errors import DuplicateKeyError

    document = {"email": "a@example.com", "username": "same.name", "password_hash": "x", "created_at": datetime.now(timezone.utc)}
    users.insert_one(dict(document))
    with pytest.raises(DuplicateKeyError):
        users.insert_one({**document, "username": "different"})  # same email
    with pytest.raises(DuplicateKeyError):
        users.insert_one({**document, "email": "b@example.com", "username": "SAME.NAME"})  # same username


def test_register_with_empty_body_reports_every_field(client, users):
    response = client.post("/api/register", json={})
    body = response.get_json()

    assert response.status_code == 400
    assert body["errors"] == {
        "email": "Enter your email address.",
        "username": "Choose a username.",
        "password": "Create a password.",
        "confirm_password": "Confirm your password.",
    }
    assert users.count_documents({}) == 0


@pytest.mark.parametrize("field, value, message_part", [
    ("email", "dana.ruiz@example", "valid email"),
    ("email", "not-an-email", "valid email"),
    ("email", "a b@example.com", "valid email"),
    ("email", "x" * 250 + "@example.com", "valid email"),
    ("username", "d@", "3–20 characters"),
    ("username", "ab", "3–20 characters"),
    ("username", "x" * 21, "3–20 characters"),
    ("username", "dana ruiz", "3–20 characters"),
    ("username", "<script>", "3–20 characters"),
    ("username", "dana'; DROP", "3–20 characters"),
    ("password", "harbor1", "too weak"),
    ("password", "abcdefgh", "too weak"),
    ("password", "12345678", "too weak"),
    ("password", "Ab1#" * 19, "72 characters"),
])
def test_register_rejects_invalid_value(client, users, field, value, message_part):
    changes = {field: value}
    if field == "password":
        changes["confirm_password"] = value
    response = register(client, **changes)
    body = response.get_json()

    assert response.status_code == 400
    assert list(body["errors"]) == [field]
    assert message_part in body["errors"][field]
    assert users.count_documents({}) == 0


def test_register_rejects_mismatched_confirmation(client, users):
    response = register(client, confirm_password="Harbor#2025")
    assert response.status_code == 400
    assert response.get_json()["errors"] == {"confirm_password": "Passwords don't match."}
    assert users.count_documents({}) == 0


@pytest.mark.parametrize("value", [{"$ne": ""}, ["a"], 12345, None, True])
def test_register_rejects_values_that_are_not_text(client, users, value):
    response = register(client, email=value, username=value)
    assert response.status_code == 400
    assert set(response.get_json()["errors"]) >= {"email", "username"}
    assert users.count_documents({}) == 0


@pytest.mark.parametrize("kwargs", [
    {"data": "not json", "content_type": "application/json"},
    {"data": "email=a@b.co", "content_type": "application/x-www-form-urlencoded"},
    {"json": ["a", "list"]},
    {},
])
def test_register_rejects_body_that_is_not_a_json_object(client, kwargs):
    response = client.post("/api/register", **kwargs)
    assert response.status_code == 400
    assert response.get_json()["success"] is False


# ---- LOGIN -----------------------------------------------------------------

def test_login_with_username_succeeds(client):
    register(client)
    response = login(client)
    body = response.get_json()

    assert response.status_code == 200
    assert body["success"] is True
    assert body["data"]["user"]["username"] == "dana.ruiz"
    assert "token" not in str(body).lower()  # the token is only in the cookie


@pytest.mark.parametrize("identifier", ["dana.ruiz@example.com", "DANA.RUIZ@EXAMPLE.COM", "Dana.Ruiz", "  dana.ruiz  "])
def test_login_accepts_email_or_username_in_any_case(client, identifier):
    register(client)
    assert login(client, identifier).status_code == 200


def test_login_sets_an_httponly_samesite_cookie(client):
    register(client)
    header = set_cookie_header(login(client))

    assert header.startswith(COOKIE + "=")
    assert "HttpOnly" in header
    assert "SameSite=Lax" in header
    assert "Path=/" in header
    assert "Max-Age=3600" in header
    assert "Secure" not in header  # off by default for http://localhost


def test_cookie_is_marked_secure_when_configured():
    app = create_app({**TEST_CONFIG, "COOKIE_SECURE": True})
    client = app.test_client()
    register(client)
    assert "Secure" in set_cookie_header(login(client))


def test_token_contains_no_personal_data(client):
    register(client)
    claims = jwt.decode(token_from(login(client)), options={"verify_signature": False})
    assert set(claims) == {"sub", "jti", "iat", "exp"}
    assert claims["exp"] - claims["iat"] == 3600


def test_wrong_password_is_rejected(client):
    register(client)
    response = login(client, password="Harbor#2025")
    body = response.get_json()

    assert response.status_code == 401
    assert body == {"success": False, "message": "Incorrect email, username or password.", "code": "invalid_credentials"}
    assert set_cookie_header(response) == ""


def test_unknown_user_gets_the_same_answer_as_a_wrong_password(client):
    register(client)
    wrong_password = login(client, password="Harbor#2025")
    unknown_user = login(client, identifier="nobody.here")
    unknown_email = login(client, identifier="nobody@example.com")

    assert unknown_user.status_code == unknown_email.status_code == 401
    assert unknown_user.get_json() == unknown_email.get_json() == wrong_password.get_json()


def test_login_with_missing_fields(client):
    response = client.post("/api/login", json={})
    assert response.status_code == 400
    assert response.get_json()["errors"] == {
        "identifier": "Enter your email or username.",
        "password": "Enter your password.",
    }


@pytest.mark.parametrize("payload", [
    {"identifier": {"$ne": ""}, "password": PASSWORD},
    {"identifier": {"$gt": ""}, "password": {"$gt": ""}},
    {"identifier": "dana.ruiz", "password": {"$ne": ""}},
    {"identifier": ["dana.ruiz"], "password": PASSWORD},
])
def test_login_rejects_query_operator_injection(client, payload):
    register(client)
    response = client.post("/api/login", json=payload)
    assert response.status_code == 400
    assert set_cookie_header(response) == ""


def test_login_treats_regex_characters_as_plain_text(client):
    register(client)
    assert login(client, identifier=".*").status_code == 401
    assert login(client, identifier="dana.ruiz|x").status_code == 401


# ---- PROTECTED ROUTE -------------------------------------------------------

def test_dashboard_without_login_is_refused(client):
    response = client.get("/api/dashboard")
    assert response.status_code == 401
    assert response.get_json() == {"success": False, "message": "Please log in to continue.", "code": "auth_required"}


def test_dashboard_with_login_returns_the_user_and_session(client):
    register(client)
    login(client)
    response = client.get("/api/dashboard")
    data = response.get_json()["data"]

    assert response.status_code == 200
    assert data["user"]["username"] == "dana.ruiz"
    assert data["user"]["email"] == "dana.ruiz@example.com"
    assert set(data["user"]) == {"id", "email", "username", "created_at"}
    assert data["session"]["length_minutes"] == 60
    assert 3590 <= data["session"]["expires_in"] <= 3600


def test_dashboard_still_works_on_a_second_request(client):
    register(client)
    login(client)
    assert client.get("/api/dashboard").status_code == 200
    assert client.get("/api/dashboard").status_code == 200  # like refreshing the page


def test_each_user_sees_only_their_own_details(app):
    first, second = app.test_client(), app.test_client()
    register(first)
    register(second, email="sam.lee@example.com", username="sam.lee")
    login(first)
    login(second, identifier="sam.lee")

    assert first.get("/api/dashboard").get_json()["data"]["user"]["username"] == "dana.ruiz"
    assert second.get("/api/dashboard").get_json()["data"]["user"]["username"] == "sam.lee"


def make_token(app, **overrides):
    now = datetime.now(timezone.utc)
    claims = {"sub": str(ObjectId()), "jti": "test-jti", "iat": now, "exp": now + timedelta(hours=1), **overrides}
    secret = claims.pop("secret", app.config["JWT_SECRET"])
    algorithm = claims.pop("algorithm", "HS256")
    return jwt.encode({k: v for k, v in claims.items() if v is not None}, secret, algorithm=algorithm)


def test_garbage_cookie_is_refused(client):
    client.set_cookie(COOKIE, "this-is-not-a-token")
    assert client.get("/api/dashboard").status_code == 401


def test_tampered_token_is_refused(client):
    register(client)
    token = token_from(login(client))
    header, payload, signature = token.split(".")
    forged_payload = jwt.utils.base64url_encode(b'{"sub":"000000000000000000000000","jti":"x","iat":1,"exp":9999999999}').decode()

    client.set_cookie(COOKIE, f"{header}.{forged_payload}.{signature}")
    assert client.get("/api/dashboard").status_code == 401


def test_token_signed_with_another_key_is_refused(app, client, users):
    register(client)
    user_id = str(users.find_one()["_id"])
    client.set_cookie(COOKIE, make_token(app, sub=user_id, secret="an-attackers-own-secret-key-of-enough-length"))
    assert client.get("/api/dashboard").status_code == 401


def test_unsigned_token_is_refused(app, client, users):
    register(client)
    user_id = str(users.find_one()["_id"])
    client.set_cookie(COOKIE, make_token(app, sub=user_id, secret="", algorithm="none"))
    assert client.get("/api/dashboard").status_code == 401


def test_expired_token_is_refused_with_its_own_code(app, client, users):
    register(client)
    user_id = str(users.find_one()["_id"])
    past = datetime.now(timezone.utc) - timedelta(minutes=5)
    client.set_cookie(COOKIE, make_token(app, sub=user_id, iat=past - timedelta(hours=1), exp=past))

    response = client.get("/api/dashboard")
    assert response.status_code == 401
    assert response.get_json()["code"] == "session_expired"


def test_token_missing_a_required_claim_is_refused(app, client, users):
    register(client)
    user_id = str(users.find_one()["_id"])
    client.set_cookie(COOKIE, make_token(app, sub=user_id, jti=None))
    assert client.get("/api/dashboard").status_code == 401


def test_valid_token_for_a_deleted_account_is_refused(client, users):
    register(client)
    login(client)
    users.delete_many({})
    assert client.get("/api/dashboard").status_code == 401


# ---- LOGOUT ----------------------------------------------------------------

def test_logout_clears_the_cookie(client):
    register(client)
    login(client)
    response = client.post("/api/logout")
    header = set_cookie_header(response)

    assert response.status_code == 200
    assert response.get_json() == {"success": True, "message": "Logged out."}
    assert header.startswith(COOKIE + "=;")
    assert "Max-Age=0" in header
    assert "HttpOnly" in header


def test_dashboard_is_refused_after_logout(client):
    register(client)
    login(client)
    assert client.get("/api/dashboard").status_code == 200
    client.post("/api/logout")
    assert client.get("/api/dashboard").status_code == 401


def test_a_copied_token_stops_working_after_logout(app, client, revoked):
    register(client)
    token = token_from(login(client))
    client.post("/api/logout")

    thief = app.test_client()
    thief.set_cookie(COOKIE, token)
    assert thief.get("/api/dashboard").status_code == 401

    record = revoked.find_one()
    assert set(record) == {"_id", "expires_at"}
    assert token not in str(record)  # only the random token id is kept


def test_logout_ends_only_that_session(app):
    laptop, phone = app.test_client(), app.test_client()
    register(laptop)
    login(laptop)
    login(phone)

    laptop.post("/api/logout")
    assert laptop.get("/api/dashboard").status_code == 401
    assert phone.get("/api/dashboard").status_code == 200


def test_logout_without_a_session_still_succeeds(client):
    response = client.post("/api/logout")
    assert response.status_code == 200
    assert "Max-Age=0" in set_cookie_header(response)


def test_user_can_log_in_again_after_logout(client):
    register(client)
    login(client)
    client.post("/api/logout")
    assert login(client).status_code == 200
    assert client.get("/api/dashboard").status_code == 200


# ---- ERRORS, CORS AND CONFIGURATION ----------------------------------------

def test_unknown_route_returns_json_404(client):
    response = client.get("/api/nothing-here")
    assert response.status_code == 404
    assert response.get_json()["success"] is False


@pytest.mark.parametrize("method, path", [("get", "/api/register"), ("get", "/api/login"), ("get", "/api/logout"), ("post", "/api/dashboard")])
def test_wrong_method_returns_json_405(client, method, path):
    response = getattr(client, method)(path)
    assert response.status_code == 405
    assert response.get_json()["success"] is False


def test_database_unavailable_returns_503_without_details():
    # Port 1 has no MongoDB listening on it.
    app = create_app({**TEST_CONFIG, "MONGO_URI": "mongodb://127.0.0.1:1", "MONGO_TIMEOUT_MS": 300})
    response = login(app.test_client())
    text = response.get_data(as_text=True)

    assert response.status_code == 503
    assert response.get_json() == {"success": False, "message": "The service is temporarily unavailable. Please try again shortly."}
    assert "Traceback" not in text and "127.0.0.1" not in text and "pymongo" not in text.lower()


def test_unexpected_error_returns_json_500_without_details(app, monkeypatch):
    def explode(_payload):
        raise RuntimeError("secret internal detail")

    monkeypatch.setattr("auth.service.authenticate", explode)
    app.config.update(TESTING=False, PROPAGATE_EXCEPTIONS=False)
    response = login(app.test_client())

    assert response.status_code == 500
    assert response.get_json() == {"success": False, "message": "An unexpected server error occurred."}
    assert "secret internal detail" not in response.get_data(as_text=True)


def test_cors_allows_only_the_configured_origin_and_its_cookies(client):
    allowed = client.get("/api/dashboard", headers={"Origin": "http://localhost:5175"})
    blocked = client.get("/api/dashboard", headers={"Origin": "http://evil.example"})

    assert allowed.headers.get("Access-Control-Allow-Origin") == "http://localhost:5175"
    assert allowed.headers.get("Access-Control-Allow-Credentials") == "true"
    assert "Access-Control-Allow-Origin" not in blocked.headers


def test_debug_is_off_and_no_secret_is_built_in():
    from config import Config

    assert Config.DEBUG is False
    assert len(Config.JWT_SECRET) >= 32  # generated at start-up when not provided
