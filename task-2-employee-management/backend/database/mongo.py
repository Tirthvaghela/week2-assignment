"""MongoDB connection shared by the whole application."""
from flask import current_app
from pymongo import MongoClient

EMPLOYEES_COLLECTION = "employees"


def init_db(app):
    """Create one MongoClient for the app. PyMongo connects lazily, so the
    server is only contacted when the first query runs."""
    app.extensions["mongo_client"] = MongoClient(
        app.config["MONGO_URI"],
        serverSelectionTimeoutMS=app.config["MONGO_TIMEOUT_MS"],
    )


def get_db():
    client = current_app.extensions["mongo_client"]
    return client[current_app.config["MONGO_DB_NAME"]]


def get_employees_collection():
    return get_db()[EMPLOYEES_COLLECTION]
