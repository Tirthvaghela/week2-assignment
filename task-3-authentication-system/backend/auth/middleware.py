"""Route protection: the `login_required` decorator."""
from functools import wraps

from flask import current_app, g, request

from auth import service
from auth.security import decode_token
from errors import AuthenticationRequiredError


def read_token_claims():
    """Return the verified claims of the request's login cookie.

    Raises AuthenticationRequiredError if there is no cookie, or the token in
    it is expired, altered, or was cancelled by a logout.
    """
    token = request.cookies.get(current_app.config["COOKIE_NAME"])
    if not token:
        raise AuthenticationRequiredError()

    claims = decode_token(token)
    if service.is_token_revoked(claims["jti"]):
        raise AuthenticationRequiredError()
    return claims


def login_required(view):
    """Allow a route to run only for a logged-in user.

    Every request to a protected route is checked on the server. On success
    the user and the token's claims are available to the route as
    `g.current_user` and `g.token_claims`.
    """

    @wraps(view)
    def wrapper(*args, **kwargs):
        claims = read_token_claims()

        user = service.get_user_by_id(claims["sub"])
        if user is None:
            # The token is genuine but the account no longer exists.
            raise AuthenticationRequiredError()

        g.current_user = user
        g.token_claims = claims
        return view(*args, **kwargs)

    return wrapper
