"""Authentication endpoints: register, log in, log out."""
from flask import Blueprint, jsonify, request

from auth import service
from auth.middleware import read_token_claims
from auth.security import clear_auth_cookie, create_token, set_auth_cookie
from errors import AuthenticationRequiredError
from models.user import serialize_user, to_iso

auth_bp = Blueprint("auth", __name__, url_prefix="/api")


def _json_body():
    # silent=True returns None for a missing or malformed body instead of
    # raising, so the validator can report it as a normal 400 error.
    return request.get_json(silent=True)


@auth_bp.post("/register")
def register():
    user = service.register_user(_json_body())
    return jsonify(success=True, message="Account created.", data={"user": serialize_user(user)}), 201


@auth_bp.post("/login")
def login():
    user = service.authenticate(_json_body())
    token, claims = create_token(user["_id"])

    response = jsonify(
        success=True,
        message="Logged in.",
        # The token itself is not in the body; it travels only in the cookie.
        data={"user": serialize_user(user), "session": {"expires_at": to_iso(claims["exp"])}},
    )
    set_auth_cookie(response, token)
    return response, 200


@auth_bp.post("/logout")
def logout():
    # Logging out always succeeds and always clears the cookie, even if the
    # token in it is already expired or invalid.
    try:
        service.revoke_token(read_token_claims())
    except AuthenticationRequiredError:
        pass

    response = jsonify(success=True, message="Logged out.")
    clear_auth_cookie(response)
    return response, 200
