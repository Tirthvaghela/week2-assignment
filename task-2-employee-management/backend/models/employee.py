"""Employee document: validation of incoming data and conversion to JSON."""
import math
import re
from datetime import date, timedelta

SORTABLE_FIELDS = ("name", "department", "role", "salary", "joinDate")

TEXT_LIMITS = {"name": (2, 80), "department": (2, 50), "role": (2, 80)}
TEXT_LABELS = {"name": "Name", "department": "Department", "role": "Role"}
MAX_SALARY = 100_000_000
EARLIEST_JOIN_DATE = date(1970, 1, 1)
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _validate_text(field, value, errors):
    label = TEXT_LABELS[field]
    if not isinstance(value, str) or not value.strip():
        errors[field] = f"{label} is required."
        return None

    cleaned = " ".join(value.split())
    shortest, longest = TEXT_LIMITS[field]
    if not shortest <= len(cleaned) <= longest:
        errors[field] = f"{label} must be between {shortest} and {longest} characters."
    elif not any(char.isalpha() for char in cleaned):
        errors[field] = f"{label} must contain at least one letter."
    return cleaned


def _validate_salary(value, errors):
    if value is None or value == "":
        errors["salary"] = "Salary is required."
        return None
    # bool is a subclass of int in Python, so it has to be excluded explicitly.
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        errors["salary"] = "Salary must be a number."
        return None
    if value <= 0:
        errors["salary"] = "Salary must be greater than 0."
    elif value > MAX_SALARY:
        errors["salary"] = f"Salary must be {MAX_SALARY:,} or less."

    rounded = round(float(value), 2)
    return int(rounded) if rounded.is_integer() else rounded


def _validate_join_date(value, errors):
    if not isinstance(value, str) or not value.strip():
        errors["joinDate"] = "Join date is required."
        return None

    cleaned = value.strip()
    try:
        if not DATE_PATTERN.match(cleaned):
            raise ValueError
        parsed = date.fromisoformat(cleaned)
    except ValueError:
        errors["joinDate"] = "Join date must be a valid date in YYYY-MM-DD format."
        return None

    latest = date.today() + timedelta(days=365)
    if parsed < EARLIEST_JOIN_DATE:
        errors["joinDate"] = "Join date cannot be earlier than 1970."
    elif parsed > latest:
        errors["joinDate"] = "Join date cannot be more than one year in the future."
    return cleaned


def validate_employee(payload):
    """Check a request body. Returns (clean_data, errors); errors is empty
    when the data is valid. Unknown fields are ignored."""
    if not isinstance(payload, dict):
        return None, {"body": "Request body must be a JSON object."}

    errors = {}
    clean = {field: _validate_text(field, payload.get(field), errors) for field in TEXT_LIMITS}
    clean["salary"] = _validate_salary(payload.get("salary"), errors)
    clean["joinDate"] = _validate_join_date(payload.get("joinDate"), errors)
    return clean, errors


def serialize_employee(document):
    """Convert a MongoDB document to the JSON shape sent to the frontend.
    The ObjectId is exposed as a plain string `id`."""
    return {
        "id": str(document["_id"]),
        "name": document["name"],
        "department": document["department"],
        "role": document["role"],
        "salary": document["salary"],
        "joinDate": document["joinDate"],
    }
