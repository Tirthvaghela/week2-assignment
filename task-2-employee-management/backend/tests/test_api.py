"""API tests. They need a running MongoDB (see MONGO_URI)."""
from datetime import date, timedelta

import pytest
from bson import ObjectId

from app import create_app

VALID = {
    "name": "Tirth Vaghela",
    "department": "Engineering",
    "role": "Software Developer",
    "salary": 60000,
    "joinDate": "2026-06-12",
}


def add(client, **changes):
    response = client.post("/api/employees", json={**VALID, **changes})
    assert response.status_code == 201, response.get_json()
    return response.get_json()["data"]


# ---- CREATE ---------------------------------------------------------------

def test_create_returns_201_and_stores_document(client, collection):
    response = client.post("/api/employees", json=VALID)
    body = response.get_json()

    assert response.status_code == 201
    assert body["success"] is True
    assert body["message"] == "Employee added successfully."
    assert body["data"] == {**VALID, "id": body["data"]["id"]}

    stored = collection.find_one({"_id": ObjectId(body["data"]["id"])})
    assert stored["name"] == "Tirth Vaghela"
    assert stored["salary"] == 60000
    assert set(stored) == {"_id", "name", "department", "role", "salary", "joinDate"}


def test_create_trims_text_and_ignores_unknown_fields(client, collection):
    employee = add(client, name="  Priya   Nair ", isAdmin=True)
    assert employee["name"] == "Priya Nair"
    assert "isAdmin" not in collection.find_one({"_id": ObjectId(employee["id"])})


def test_create_with_missing_fields_reports_every_field(client, collection):
    response = client.post("/api/employees", json={})
    body = response.get_json()

    assert response.status_code == 400
    assert body["success"] is False
    assert set(body["errors"]) == {"name", "department", "role", "salary", "joinDate"}
    assert collection.count_documents({}) == 0


@pytest.mark.parametrize("field, value", [
    ("name", ""), ("name", "   "), ("name", "A"), ("name", "12345"), ("name", 42), ("name", "x" * 81),
    ("department", ""), ("role", None),
    ("salary", "abc"), ("salary", "60000"), ("salary", 0), ("salary", -500), ("salary", True),
    ("salary", None), ("salary", 100_000_001),
    ("joinDate", ""), ("joinDate", "12-06-2026"), ("joinDate", "2026-02-30"), ("joinDate", "2026-13-01"),
    ("joinDate", "not a date"), ("joinDate", "1969-12-31"), ("joinDate", 20260612),
])
def test_create_rejects_invalid_value(client, collection, field, value):
    response = client.post("/api/employees", json={**VALID, field: value})
    body = response.get_json()

    assert response.status_code == 400
    assert body["success"] is False
    assert list(body["errors"]) == [field]
    assert collection.count_documents({}) == 0


def test_create_rejects_join_date_far_in_future(client):
    too_late = (date.today() + timedelta(days=400)).isoformat()
    response = client.post("/api/employees", json={**VALID, "joinDate": too_late})
    assert response.status_code == 400
    assert "joinDate" in response.get_json()["errors"]


@pytest.mark.parametrize("kwargs", [
    {"data": "not json", "content_type": "application/json"},
    {"data": "name=Tirth", "content_type": "application/x-www-form-urlencoded"},
    {"json": ["a", "list"]},
    {},
])
def test_create_rejects_body_that_is_not_a_json_object(client, kwargs):
    response = client.post("/api/employees", **kwargs)
    assert response.status_code == 400
    assert response.get_json()["success"] is False


def test_create_accepts_decimal_salary(client):
    assert add(client, salary=60000.5)["salary"] == 60000.5


# ---- READ -----------------------------------------------------------------

def test_list_is_empty_at_first(client):
    response = client.get("/api/employees")
    assert response.status_code == 200
    assert response.get_json() == {"success": True, "count": 0, "data": []}


def test_list_returns_employees_without_internal_id(client):
    add(client)
    employees = client.get("/api/employees").get_json()["data"]
    assert len(employees) == 1
    assert set(employees[0]) == {"id", "name", "department", "role", "salary", "joinDate"}


def test_list_sorts_by_name_ignoring_case_by_default(client):
    for name in ["charlie", "Alice", "bob"]:
        add(client, name=name)
    names = [e["name"] for e in client.get("/api/employees").get_json()["data"]]
    assert names == ["Alice", "bob", "charlie"]


@pytest.mark.parametrize("sort, order, expected", [
    ("salary", "asc", ["Low", "Mid", "High"]),
    ("salary", "desc", ["High", "Mid", "Low"]),
    ("joinDate", "asc", ["High", "Low", "Mid"]),
    ("joinDate", "desc", ["Mid", "Low", "High"]),
    ("department", "asc", ["Mid", "High", "Low"]),
    ("name", "desc", ["Mid", "Low", "High"]),
])
def test_list_sorting(client, sort, order, expected):
    add(client, name="Low", salary=9000, department="Sales", joinDate="2022-05-01")
    add(client, name="Mid", salary=50000, department="Design", joinDate="2024-01-01")
    add(client, name="High", salary=200000, department="Finance", joinDate="2019-03-01")

    response = client.get(f"/api/employees?sort={sort}&order={order}")
    assert [e["name"] for e in response.get_json()["data"]] == expected


def test_list_search_matches_name_department_and_role(client):
    add(client, name="Aarav Mehta", department="Engineering", role="Backend Developer")
    add(client, name="Sneha Kulkarni", department="Design", role="Product Designer")
    add(client, name="Vikram Singh", department="Sales", role="Sales Engineer")

    def search(term):
        data = client.get("/api/employees", query_string={"search": term}).get_json()["data"]
        return sorted(e["name"] for e in data)

    assert search("sneha") == ["Sneha Kulkarni"]
    assert search("DESIGN") == ["Sneha Kulkarni"]
    assert search("engineer") == ["Aarav Mehta", "Vikram Singh"]
    assert search("nobody") == []
    assert search(".*") == []  # treated as literal text, not a regular expression


def test_list_filters_by_department_and_combines_with_search(client):
    add(client, name="Aarav Mehta", department="Engineering")
    add(client, name="Priya Nair", department="Engineering")
    add(client, name="Sneha Kulkarni", department="Design")

    by_department = client.get("/api/employees?department=Engineering").get_json()
    assert by_department["count"] == 2

    combined = client.get("/api/employees?department=Engineering&search=priya").get_json()
    assert [e["name"] for e in combined["data"]] == ["Priya Nair"]


@pytest.mark.parametrize("query", ["sort=password", "order=sideways"])
def test_list_rejects_unknown_sort_options(client, query):
    response = client.get(f"/api/employees?{query}")
    assert response.status_code == 400
    assert response.get_json()["success"] is False


# ---- UPDATE ---------------------------------------------------------------

def test_update_changes_the_stored_document(client, collection):
    employee = add(client)
    changes = {**VALID, "role": "Senior Developer", "salary": 95000}

    response = client.put(f"/api/employees/{employee['id']}", json=changes)
    body = response.get_json()

    assert response.status_code == 200
    assert body["message"] == "Employee updated successfully."
    assert body["data"] == {**changes, "id": employee["id"]}
    stored = collection.find_one({"_id": ObjectId(employee["id"])})
    assert (stored["role"], stored["salary"]) == ("Senior Developer", 95000)
    assert collection.count_documents({}) == 1


def test_update_with_invalid_data_leaves_document_unchanged(client, collection):
    employee = add(client)
    response = client.put(f"/api/employees/{employee['id']}", json={**VALID, "salary": -1})

    assert response.status_code == 400
    assert "salary" in response.get_json()["errors"]
    assert collection.find_one({"_id": ObjectId(employee["id"])})["salary"] == 60000


def test_update_unknown_employee_returns_404(client):
    response = client.put(f"/api/employees/{ObjectId()}", json=VALID)
    assert response.status_code == 404
    assert response.get_json() == {"success": False, "message": "Employee not found."}


def test_update_malformed_id_returns_400(client):
    response = client.put("/api/employees/not-an-id", json=VALID)
    assert response.status_code == 400
    assert response.get_json()["message"] == "Invalid employee id."


# ---- DELETE ---------------------------------------------------------------

def test_delete_removes_the_document(client, collection):
    keep = add(client, name="Keep Me")
    remove = add(client, name="Remove Me")

    response = client.delete(f"/api/employees/{remove['id']}")

    assert response.status_code == 200
    assert response.get_json() == {
        "success": True,
        "message": "Employee deleted successfully.",
        "data": {"id": remove["id"]},
    }
    assert [d["_id"] for d in collection.find()] == [ObjectId(keep["id"])]


def test_delete_twice_returns_404_the_second_time(client):
    employee = add(client)
    assert client.delete(f"/api/employees/{employee['id']}").status_code == 200
    assert client.delete(f"/api/employees/{employee['id']}").status_code == 404


def test_delete_malformed_id_returns_400(client):
    assert client.delete("/api/employees/123").status_code == 400


# ---- ERRORS ---------------------------------------------------------------

def test_unknown_route_returns_json_404(client):
    response = client.get("/api/nothing-here")
    assert response.status_code == 404
    assert response.get_json()["success"] is False


def test_wrong_method_returns_json_405(client):
    response = client.patch("/api/employees")
    assert response.status_code == 405
    assert response.get_json()["success"] is False


def test_database_unavailable_returns_503_without_traceback():
    # Port 1 has no MongoDB listening on it.
    app = create_app({"MONGO_URI": "mongodb://127.0.0.1:1", "MONGO_TIMEOUT_MS": 300})
    response = app.test_client().get("/api/employees")

    assert response.status_code == 503
    assert response.get_json() == {
        "success": False,
        "message": "The database is unavailable. Please try again shortly.",
    }
    assert "Traceback" not in response.get_data(as_text=True)


def test_unexpected_error_returns_json_500(app, monkeypatch):
    def explode(**_):
        raise RuntimeError("secret internal detail")

    monkeypatch.setattr("services.employee_service.list_employees", explode)
    app.config.update(TESTING=False, PROPAGATE_EXCEPTIONS=False)
    response = app.test_client().get("/api/employees")

    assert response.status_code == 500
    assert response.get_json() == {"success": False, "message": "An unexpected server error occurred."}
    assert "secret internal detail" not in response.get_data(as_text=True)


def test_cors_allows_configured_origin_only(client):
    allowed = client.get("/api/employees", headers={"Origin": "http://localhost:5173"})
    blocked = client.get("/api/employees", headers={"Origin": "http://evil.example"})
    assert allowed.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"
    assert "Access-Control-Allow-Origin" not in blocked.headers
