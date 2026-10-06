"""The protected endpoint behind the dashboard page."""
from datetime import datetime, timezone

from flask import Blueprint, current_app, g, jsonify

from auth.middleware import login_required
from models.user import serialize_user, to_iso

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api")


@dashboard_bp.get("/dashboard")
@login_required
def dashboard():
    """Return the logged-in user's details and when their session ends.

    `login_required` has already verified the token, so this code only runs
    for an authenticated user.
    """
    claims = g.token_claims
    seconds_left = int((claims["exp"] - datetime.now(timezone.utc)).total_seconds())

    return jsonify(
        success=True,
        data={
            "user": serialize_user(g.current_user),
            "session": {
                "issued_at": to_iso(claims["iat"]),
                "expires_at": to_iso(claims["exp"]),
                "expires_in": max(seconds_left, 0),
                "length_minutes": current_app.config["JWT_EXPIRES_MINUTES"],
            },
        },
    ), 200
