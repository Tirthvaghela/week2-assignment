"""Exceptions raised by the auth code and turned into JSON by app.py."""


class ApiError(Exception):
    """An error that is safe to show to the user.

    status  HTTP status code
    message short explanation
    errors  optional {field: message} for form fields
    code    optional machine-readable reason, used by the frontend
    """

    status = 400

    def __init__(self, message, errors=None, code=None):
        super().__init__(message)
        self.message = message
        self.errors = errors or {}
        self.code = code


class ValidationError(ApiError):
    status = 400


class InvalidCredentialsError(ApiError):
    status = 401

    def __init__(self):
        # One message for every failed login, so the response never reveals
        # whether the account exists.
        super().__init__("Incorrect email, username or password.", code="invalid_credentials")


class AuthenticationRequiredError(ApiError):
    status = 401

    def __init__(self, code="auth_required"):
        message = (
            "Your session has expired. Please log in again."
            if code == "session_expired"
            else "Please log in to continue."
        )
        super().__init__(message, code=code)


class DuplicateAccountError(ApiError):
    status = 409

    def __init__(self, errors):
        super().__init__("An account with these details already exists.", errors=errors)
