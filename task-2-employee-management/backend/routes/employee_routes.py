"""REST endpoints for employees. Each route reads the request, calls the
service layer and wraps the result in the standard JSON envelope."""
from flask import Blueprint, jsonify, request

from services import employee_service

employee_bp = Blueprint("employees", __name__, url_prefix="/api/employees")


def _json_body():
    # silent=True returns None for a missing or malformed body instead of
    # raising, so the validator can report it as a normal 400 error.
    return request.get_json(silent=True)


@employee_bp.get("", strict_slashes=False)
def get_employees():
    employees = employee_service.list_employees(
        search=request.args.get("search", "").strip(),
        department=request.args.get("department", "").strip(),
        sort=request.args.get("sort", "name"),
        order=request.args.get("order", "asc"),
    )
    return jsonify(success=True, count=len(employees), data=employees), 200


@employee_bp.post("", strict_slashes=False)
def add_employee():
    employee = employee_service.create_employee(_json_body())
    return jsonify(success=True, message="Employee added successfully.", data=employee), 201


@employee_bp.put("/<employee_id>")
def edit_employee(employee_id):
    employee = employee_service.update_employee(employee_id, _json_body())
    return jsonify(success=True, message="Employee updated successfully.", data=employee), 200


@employee_bp.delete("/<employee_id>")
def remove_employee(employee_id):
    deleted = employee_service.delete_employee(employee_id)
    return jsonify(success=True, message="Employee deleted successfully.", data=deleted), 200
