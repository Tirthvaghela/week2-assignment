"""Password hashing (bcrypt) and login tokens (JWT)."""
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from flask import current_app

from errors import AuthenticationRequiredError

# ---- Passwords -------------------------------------------------------------


def hash_password(password):
    """Return a bcrypt hash of the password.

    bcrypt adds a random salt, so the same password gives a different hash
    every time, and it is deliberately slow, which makes guessing expensive.
    The hash cannot be turned back into the password.
    """
    salt = bcrypt.gensalt(rounds=current_app.config["BCRYPT_ROUNDS"])
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password, password_hash):
    """Check a password against a stored hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # The stored value is not a valid bcrypt hash.
        return False


# ---- Tokens ----------------------------------------------------------------


def create_token(user_id):
    """Create a signed JWT for a user. Returns (token, claims).

    Claims inside the token:
      sub  the user's id
      jti  a unique id for this token, used to cancel it at logout
      iat  when it was issued
      exp  when it expires
    The token holds no password and no personal details.
    """
    now = datetime.now(timezone.utc).replace(microsecond=0)
    claims = {
        "sub": str(user_id),
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": now + timedelta(minutes=current_app.config["JWT_EXPIRES_MINUTES"]),
    }
    token = jwt.encode(
        claims, current_app.config["JWT_SECRET"], algorithm=current_app.config["JWT_ALGORITHM"]
    )
    return token, claims


def decode_token(token):
    """Verify a token's signature and expiry and return its claims.

    Raises AuthenticationRequiredError if the token is expired, has been
    altered, was signed with a different key, or is malformed.
    """
    try:
        claims = jwt.decode(
            token,
            current_app.config["JWT_SECRET"],
            # Naming the algorithm stops a forged token from choosing its own.
            algorithms=[current_app.config["JWT_ALGORITHM"]],
            options={"require": ["sub", "jti", "iat", "exp"]},
        )
    except jwt.ExpiredSignatureError:
        raise AuthenticationRequiredError(code="session_expired")
    except jwt.InvalidTokenError:
        raise AuthenticationRequiredError()

    claims["iat"] = datetime.fromtimestamp(claims["iat"], timezone.utc)
    claims["exp"] = datetime.fromtimestamp(claims["exp"], timezone.utc)
    return claims


# ---- Cookie ----------------------------------------------------------------


def set_auth_cookie(response, token):
    """Attach the token to the response as a cookie.

    HttpOnly  JavaScript on the page cannot read it, so a script injected
              into the page cannot steal the login.
    SameSite  the browser does not send it on requests started by other
              websites, which blocks cross-site request forgery.
    Secure    sent over HTTPS only (switched on by COOKIE_SECURE).
    """
    config = current_app.config
    response.set_cookie(
        config["COOKIE_NAME"],
        token,
        max_age=config["JWT_EXPIRES_MINUTES"] * 60,
        httponly=True,
        secure=config["COOKIE_SECURE"],
        samesite=config["COOKIE_SAMESITE"],
        path="/",
    )


def clear_auth_cookie(response):
    """Tell the browser to delete the login cookie."""
    config = current_app.config
    response.delete_cookie(
        config["COOKIE_NAME"],
        httponly=True,
        secure=config["COOKIE_SECURE"],
        samesite=config["COOKIE_SAMESITE"],
        path="/",
    )
