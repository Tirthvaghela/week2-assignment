"""Flask application factory and entry point.

Run the development server with:  python app.py
"""
from flask import Flask, jsonify
from flask_cors import CORS
from pymongo.errors import PyMongoError
from werkzeug.exceptions import HTTPException

from auth.routes import auth_bp
from config import Config
from database.mongo import ensure_indexes, init_db
from errors import ApiError
from routes.dashboard_routes import dashboard_bp


def create_app(overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if overrides:
        app.config.update(overrides)

    if app.config.get("JWT_SECRET_IS_TEMPORARY") and not app.config.get("TESTING"):
        app.logger.warning(
            "JWT_SECRET is not set. Using a temporary key: all logins will end when "
            "the server restarts. Set JWT_SECRET in backend/.env (see .env.example)."
        )

    # Only the listed frontend origins may call the API from a browser, and
    # they are allowed to send the login cookie.
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    init_db(app)
    with app.app_context():
        try:
            ensure_indexes()
        except PyMongoError as error:
            # The server still starts, and requests report the database as
            # unavailable until MongoDB is reachable.
            app.logger.error("Could not prepare database indexes: %s", error)

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    register_error_handlers(app)
    return app


def register_error_handlers(app):
    """Every error leaves the API as JSON in the same shape, and no Python
    traceback or database detail is ever sent to the client."""

    @app.errorhandler(ApiError)
    def handle_api_error(error):
        body = {"success": False, "message": error.message}
        if error.errors:
            body["errors"] = error.errors
        if error.code:
            body["code"] = error.code
        return jsonify(body), error.status

    @app.errorhandler(PyMongoError)
    def handle_database(error):
        app.logger.error("Database error: %s", error)
        message = "The service is temporarily unavailable. Please try again shortly."
        return jsonify(success=False, message=message), 503

    @app.errorhandler(HTTPException)
    def handle_http(error):
        # Unknown URLs (404), wrong methods (405) and similar.
        return jsonify(success=False, message=error.description), error.code

    @app.errorhandler(Exception)
    def handle_unexpected(error):
        app.logger.exception("Unexpected error: %s", error)
        return jsonify(success=False, message="An unexpected server error occurred."), 500


app = create_app()

if __name__ == "__main__":
    app.run(host=app.config["HOST"], port=app.config["PORT"], debug=app.config["DEBUG"])
