"""User document: how a user is stored and what is sent to the browser."""
from datetime import datetime, timezone


def new_user_document(email, username, password_hash):
    """Build the document saved in the `users` collection.

    Only the bcrypt hash is stored. The plain password never reaches here.
    """
    return {
        "email": email,
        "username": username,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc),
    }


def to_iso(moment):
    """Format a datetime as an ISO 8601 string in UTC, e.g. 2026-03-12T09:42:00Z."""
    return moment.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def serialize_user(document):
    """Convert a user document to the JSON sent to the frontend.

    The password hash is deliberately left out, so it can never appear in an
    API response.
    """
    return {
        "id": str(document["_id"]),
        "email": document["email"],
        "username": document["username"],
        "created_at": to_iso(document["created_at"]),
    }
