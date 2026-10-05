"""Business logic for employees. Routes call these functions; these functions
are the only code that talks to the employees collection."""
import re

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, DESCENDING
from pymongo.collation import Collation

from database.mongo import get_employees_collection
from errors import NotFoundError, ValidationError
from models.employee import SORTABLE_FIELDS, serialize_employee, validate_employee

# Makes text sorting ignore upper and lower case.
CASE_INSENSITIVE = Collation(locale="en", strength=2)


def _object_id(employee_id):
    try:
        return ObjectId(employee_id)
    except (InvalidId, TypeError):
        raise ValidationError("Invalid employee id.")


def _validated(payload):
    data, errors = validate_employee(payload)
    if errors:
        raise ValidationError("Validation failed.", errors)
    return data


def list_employees(search="", department="", sort="name", order="asc"):
    if sort not in SORTABLE_FIELDS:
        raise ValidationError(f"sort must be one of: {', '.join(SORTABLE_FIELDS)}.")
    if order not in ("asc", "desc"):
        raise ValidationError("order must be 'asc' or 'desc'.")

    query = {}
    if search:
        # Escaped so the search text is matched literally, not as a regex.
        pattern = {"$regex": re.escape(search), "$options": "i"}
        query["$or"] = [{"name": pattern}, {"department": pattern}, {"role": pattern}]
    if department:
        query["department"] = department

    direction = ASCENDING if order == "asc" else DESCENDING
    cursor = (
        get_employees_collection()
        .find(query)
        .sort([(sort, direction), ("_id", ASCENDING)])
        .collation(CASE_INSENSITIVE)
    )
    return [serialize_employee(document) for document in cursor]


def create_employee(payload):
    data = _validated(payload)
    result = get_employees_collection().insert_one(dict(data))
    return serialize_employee({**data, "_id": result.inserted_id})


def update_employee(employee_id, payload):
    object_id = _object_id(employee_id)
    data = _validated(payload)
    result = get_employees_collection().update_one({"_id": object_id}, {"$set": data})
    if result.matched_count == 0:
        raise NotFoundError()
    return serialize_employee({**data, "_id": object_id})


def delete_employee(employee_id):
    object_id = _object_id(employee_id)
    result = get_employees_collection().delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise NotFoundError()
    return {"id": employee_id}
