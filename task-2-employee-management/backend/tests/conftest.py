"""Test setup: every test runs against a separate MongoDB database, so the
development data is never touched."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app  # noqa: E402
from database.mongo import get_employees_collection  # noqa: E402

TEST_DB_NAME = "employee_management_test"


@pytest.fixture()
def app():
    app = create_app({"MONGO_DB_NAME": TEST_DB_NAME, "TESTING": True})
    with app.app_context():
        get_employees_collection().delete_many({})
    yield app
    with app.app_context():
        get_employees_collection().database.client.drop_database(TEST_DB_NAME)


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def collection(app):
    with app.app_context():
        yield get_employees_collection()
