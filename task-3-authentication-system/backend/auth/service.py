"""Authentication logic: register, check credentials, end a session.

Routes call these functions. These functions are the only code that reads or
writes the `users` and `revoked_tokens` collections.
"""
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError

from auth.security import hash_password, verify_password
from auth.validation import validate_login, validate_registration
from database.mongo import (
    CASE_INSENSITIVE,
    get_revoked_tokens_collection,
    get_users_collection,
)
from errors import DuplicateAccountError, InvalidCredentialsError
from models.user import new_user_document

DUPLICATE_EMAIL = "An account with this email already exists. Log in instead."
DUPLICATE_USERNAME = "This username is taken. Try another."

# A real bcrypt hash of a throwaway value. When a login names an account that
# does not exist, the password is still checked against this, so the reply
# takes about as long as it does for a real account. Otherwise response time
# would reveal which usernames are registered.
_DUMMY_HASH = "$2b$12$S5F9yLVI/ZtNrROVMCc3X.YI4ns2eCmyb9JTgRBDWAIrQ1cAox2iW"


def _find_by_email(email):
    return get_users_collection().find_one({"email": email})


def _find_by_username(username):
    return get_users_collection().find_one({"username": username}, collation=CASE_INSENSITIVE)


def register_user(payload):
    """Create an account and return the stored user document."""
    data = validate_registration(payload)

    duplicates = {}
    if _find_by_email(data["email"]):
        duplicates["email"] = DUPLICATE_EMAIL
    if _find_by_username(data["username"]):
        duplicates["username"] = DUPLICATE_USERNAME
    if duplicates:
        raise DuplicateAccountError(duplicates)

    document = new_user_document(
        email=data["email"],
        username=data["username"],
        password_hash=hash_password(data["password"]),
    )
    try:
        result = get_users_collection().insert_one(document)
    except DuplicateKeyError as error:
        # Two registrations for the same account arrived together and the
        # other one won. The unique index caught it.
        field = "username" if "username" in str(error) else "email"
        message = DUPLICATE_USERNAME if field == "username" else DUPLICATE_EMAIL
        raise DuplicateAccountError({field: message})

    document["_id"] = result.inserted_id
    return document


def authenticate(payload):
    """Check an email-or-username and password. Returns the user document, or
    raises InvalidCredentialsError without saying which part was wrong."""
    data = validate_login(payload)
    identifier = data["identifier"]

    if "@" in identifier:
        user = _find_by_email(identifier.lower())
    else:
        user = _find_by_username(identifier)

    stored_hash = user["password_hash"] if user else _DUMMY_HASH
    password_matches = verify_password(data["password"], stored_hash)

    if not user or not password_matches:
        raise InvalidCredentialsError()
    return user


def get_user_by_id(user_id):
    try:
        return get_users_collection().find_one({"_id": ObjectId(user_id)})
    except (InvalidId, TypeError):
        return None


def revoke_token(claims):
    """Record a token's id so it is refused from now on.

    Deleting the cookie only removes the token from this browser. Recording
    its id means a copy of the token kept elsewhere stops working too. Only
    the random id is stored, never the token itself.
    """
    get_revoked_tokens_collection().update_one(
        {"_id": claims["jti"]},
        {"$set": {"expires_at": claims["exp"]}},
        upsert=True,
    )


def is_token_revoked(jti):
    return get_revoked_tokens_collection().count_documents({"_id": jti}, limit=1) > 0
