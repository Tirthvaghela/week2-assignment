"""Validation and sanitization of registration and login input.

Every value from the browser is checked here before it is used. The rules
match the ones the React forms apply, but this is the check that counts:
the browser's checks can be bypassed by calling the API directly.
"""
import re
import unicodedata

from errors import ValidationError

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9._]{3,20}$")

EMAIL_MAX_LENGTH = 254
PASSWORD_MIN_LENGTH = 8
# bcrypt only reads the first 72 bytes of a password, so longer ones are
# refused instead of being silently cut short.
PASSWORD_MAX_BYTES = 72
MIN_PASSWORD_SCORE = 3

PASSWORD_HINT = "Use 8 or more characters with letters, numbers and a symbol."

MESSAGES = {
    "email_empty": "Enter your email address.",
    "email_invalid": "Enter a valid email address, like name@example.com.",
    "username_empty": "Choose a username.",
    "username_invalid": "Use 3–20 characters: letters, numbers, dots or underscores.",
    "password_empty": "Create a password.",
    "password_weak": f"This password is too weak. {PASSWORD_HINT}",
    "password_long": "Use a password of 72 characters or fewer.",
    "confirm_empty": "Confirm your password.",
    "confirm_mismatch": "Passwords don't match.",
    "identifier_empty": "Enter your email or username.",
    "login_password_empty": "Enter your password.",
}


def _text(payload, field):
    """Return a field as a string, or "" if it is missing or not a string.

    Refusing non-string values matters for MongoDB: a JSON object such as
    {"$ne": ""} sent in place of a string would otherwise be passed into a
    query as an operator (a "NoSQL injection").
    """
    value = payload.get(field)
    return value if isinstance(value, str) else ""


def _clean(value):
    """Normalise Unicode look-alikes and remove surrounding spaces and any
    invisible control characters."""
    value = unicodedata.normalize("NFKC", value)
    value = "".join(char for char in value if unicodedata.category(char)[0] != "C")
    return value.strip()


def password_score(password):
    """Strength from 0 to 4. One point each for: 8+ characters, both upper and
    lower case, a digit, a symbol. Shorter than 8 characters is always 1."""
    if not password:
        return 0
    score = 0
    if len(password) >= PASSWORD_MIN_LENGTH:
        score += 1
    if re.search(r"[a-z]", password) and re.search(r"[A-Z]", password):
        score += 1
    if re.search(r"\d", password):
        score += 1
    if re.search(r"[^A-Za-z0-9]", password):
        score += 1
    return 1 if len(password) < PASSWORD_MIN_LENGTH else max(score, 1)


def _require_json_object(payload):
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object.")


def validate_registration(payload):
    """Check a registration request. Returns the cleaned email, username and
    password, or raises ValidationError listing every invalid field."""
    _require_json_object(payload)

    email = _clean(_text(payload, "email")).lower()
    username = _clean(_text(payload, "username"))
    # Passwords are not trimmed or altered: spaces can be part of one.
    password = _text(payload, "password")
    confirm = _text(payload, "confirm_password")

    errors = {}

    if not email:
        errors["email"] = MESSAGES["email_empty"]
    elif len(email) > EMAIL_MAX_LENGTH or not EMAIL_PATTERN.match(email):
        errors["email"] = MESSAGES["email_invalid"]

    if not username:
        errors["username"] = MESSAGES["username_empty"]
    elif not USERNAME_PATTERN.match(username):
        errors["username"] = MESSAGES["username_invalid"]

    if not password:
        errors["password"] = MESSAGES["password_empty"]
    elif len(password.encode("utf-8")) > PASSWORD_MAX_BYTES:
        errors["password"] = MESSAGES["password_long"]
    elif password_score(password) < MIN_PASSWORD_SCORE:
        errors["password"] = MESSAGES["password_weak"]

    if not confirm:
        errors["confirm_password"] = MESSAGES["confirm_empty"]
    elif confirm != password:
        errors["confirm_password"] = MESSAGES["confirm_mismatch"]

    if errors:
        raise ValidationError("Please correct the highlighted fields.", errors)
    return {"email": email, "username": username, "password": password}


def validate_login(payload):
    """Check a login request. Returns the cleaned identifier (email or
    username) and the password, or raises ValidationError."""
    _require_json_object(payload)

    identifier = _clean(_text(payload, "identifier"))
    password = _text(payload, "password")

    errors = {}
    if not identifier:
        errors["identifier"] = MESSAGES["identifier_empty"]
    if not password:
        errors["password"] = MESSAGES["login_password_empty"]

    if errors:
        raise ValidationError("Please fill in all required fields.", errors)
    return {"identifier": identifier, "password": password}
