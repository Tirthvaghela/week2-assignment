"""Flask application factory and entry point.

Run the development server with:  python app.py
"""
from flask import Flask, jsonify
from flask_cors import CORS
from pymongo.errors import PyMongoError
from werkzeug.exceptions import HTTPException

from config import Config
from database.mongo import init_db
from errors import NotFoundError, ValidationError
from routes.employee_routes import employee_bp


def create_app(overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if overrides:
        app.config.update(overrides)

    # Only the listed frontend origins may call the API from a browser.
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    init_db(app)
    app.register_blueprint(employee_bp)
    register_error_handlers(app)
    return app


def register_error_handlers(app):
    """Every error leaves the API as JSON in the same envelope, and no
    Python traceback is ever sent to the client."""

    @app.errorhandler(ValidationError)
    def handle_validation(error):
        body = {"success": False, "message": error.message}
        if error.errors:
            body["errors"] = error.errors
        return jsonify(body), 400

    @app.errorhandler(NotFoundError)
    def handle_not_found(error):
        return jsonify(success=False, message=error.message), 404

    @app.errorhandler(PyMongoError)
    def handle_database(error):
        app.logger.error("Database error: %s", error)
        message = "The database is unavailable. Please try again shortly."
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
