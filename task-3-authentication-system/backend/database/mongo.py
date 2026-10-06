"""MongoDB connection and indexes."""
from flask import current_app
from pymongo import ASCENDING, MongoClient
from pymongo.collation import Collation

USERS_COLLECTION = "users"
REVOKED_TOKENS_COLLECTION = "revoked_tokens"

# Makes username comparisons ignore upper and lower case, so "Dana" and
# "dana" count as the same username.
CASE_INSENSITIVE = Collation(locale="en", strength=2)


def init_db(app):
    """Create one MongoClient for the app. PyMongo connects lazily, so the
    server is only contacted when the first query runs."""
    app.extensions["mongo_client"] = MongoClient(
        app.config["MONGO_URI"],
        serverSelectionTimeoutMS=app.config["MONGO_TIMEOUT_MS"],
        tz_aware=True,
    )


def get_db():
    client = current_app.extensions["mongo_client"]
    return client[current_app.config["MONGO_DB_NAME"]]


def get_users_collection():
    return get_db()[USERS_COLLECTION]


def get_revoked_tokens_collection():
    return get_db()[REVOKED_TOKENS_COLLECTION]


def ensure_indexes():
    """Create the indexes the app relies on. Safe to call repeatedly."""
    users = get_users_collection()
    # The database itself refuses a second account with the same email or
    # username, even if two requests arrive at the same moment.
    users.create_index([("email", ASCENDING)], unique=True, name="unique_email")
    users.create_index(
        [("username", ASCENDING)],
        unique=True,
        name="unique_username",
        collation=CASE_INSENSITIVE,
    )
    # MongoDB deletes each revoked-token record once the token would have
    # expired anyway, so this collection never grows without limit.
    get_revoked_tokens_collection().create_index(
        [("expires_at", ASCENDING)], expireAfterSeconds=0, name="expire_revoked_tokens"
    )
