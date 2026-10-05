"""Exceptions raised by the service layer and turned into JSON by app.py."""


class ValidationError(Exception):
    """The request data is invalid. `errors` maps field names to messages."""

    def __init__(self, message="Validation failed.", errors=None):
        super().__init__(message)
        self.message = message
        self.errors = errors or {}


class NotFoundError(Exception):
    """The requested employee does not exist."""

    def __init__(self, message="Employee not found."):
        super().__init__(message)
        self.message = message
