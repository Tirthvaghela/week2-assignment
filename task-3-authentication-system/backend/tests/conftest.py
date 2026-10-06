"""Test setup: every test runs against a separate MongoDB database, so real
accounts are never touched."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app  # noqa: E402
from database.mongo import ensure_indexes, get_db  # noqa: E402

TEST_DB_NAME = "authentication_system_test"

TEST_CONFIG = {
    "MONGO_DB_NAME": TEST_DB_NAME,
    "TESTING": True,
    "JWT_SECRET": "test-only-secret-key-not-used-anywhere-else",
    # The lowest bcrypt cost keeps the test suite fast. Real hashing uses 12.
    "BCRYPT_ROUNDS": 4,
}


@pytest.fixture()
def app():
    app = create_app(TEST_CONFIG)
    with app.app_context():
        database = get_db()
        database.client.drop_database(TEST_DB_NAME)
        ensure_indexes()
    yield app
    with app.app_context():
        get_db().client.drop_database(TEST_DB_NAME)


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def users(app):
    with app.app_context():
        yield get_db()["users"]


@pytest.fixture()
def revoked(app):
    with app.app_context():
        yield get_db()["revoked_tokens"]
