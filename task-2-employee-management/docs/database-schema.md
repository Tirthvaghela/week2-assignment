# Database Schema

The application stores its data in MongoDB.

| Item | Value |
| --- | --- |
| Database | `employee_management` (set by `MONGO_DB_NAME`) |
| Collection | `employees` |
| One document | One employee |

MongoDB creates the database and the collection automatically the first time an employee is saved, so there is no schema file or migration to run.

## `employees` collection

| Field | BSON type | Required | Purpose | Rules |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | Yes (generated) | Unique identifier. Created by MongoDB on insert. | Never sent by the client. |
| `name` | String | Yes | The employee's full name. | 2 to 80 characters, must contain a letter. |
| `department` | String | Yes | The department the employee belongs to. | 2 to 50 characters, must contain a letter. |
| `role` | String | Yes | The employee's job title. | 2 to 80 characters, must contain a letter. |
| `salary` | Number (Int32, Int64 or Double) | Yes | Annual salary, as a plain number with no currency symbol. | Greater than 0, at most 100,000,000, rounded to 2 decimal places. |
| `joinDate` | String | Yes | The date the employee joined, as `YYYY-MM-DD`. | A real calendar date from 1970-01-01 up to one year from today. |

There are no optional fields. A request that leaves any of the five fields out is rejected.

### Example document

```json
{
  "_id": { "$oid": "6ac39e2ebdac8018066b53c6" },
  "name": "Tirth Vaghela",
  "department": "Engineering",
  "role": "Software Developer",
  "salary": 60000,
  "joinDate": "2026-06-12"
}
```

## How the API presents a document

The API never returns `_id` in its raw form. It converts the ObjectId to a string and returns it as `id`:

```json
{
  "id": "6ac39e2ebdac8018066b53c6",
  "name": "Tirth Vaghela",
  "department": "Engineering",
  "role": "Software Developer",
  "salary": 60000,
  "joinDate": "2026-06-12"
}
```

That `id` is what the frontend sends back in `PUT /api/employees/<id>` and `DELETE /api/employees/<id>`.

## Design notes

- **Where the rules are enforced.** MongoDB does not enforce a schema by default, so the rules above are applied by the Flask backend in `backend/models/employee.py` before anything is written. The React form applies the same rules for immediate feedback, but the backend check is the one that protects the data.
- **Text is tidied before saving.** Leading and trailing spaces are removed and repeated spaces are collapsed, so `"  Priya   Nair "` is stored as `"Priya Nair"`.
- **Unknown fields are dropped.** Only the five fields above are written, whatever else a request contains.
- **`joinDate` is a string, not a BSON Date.** The value is a calendar date with no time or time zone. Storing it as `YYYY-MM-DD` text keeps it exactly as entered, and that format sorts correctly as plain text.
- **`salary` is a number.** This lets MongoDB sort by salary numerically. Whole amounts are stored as integers and amounts with decimals as doubles.
- **Sorting ignores case.** List queries use an English, case-insensitive collation, so `bob` sorts between `Alice` and `Charlie`.
- **No extra indexes.** The collection is small and every query is a simple filter and sort, so the default `_id` index is enough. A larger deployment would add indexes on the sorted fields.

## Test database

The automated backend tests use a separate database named `employee_management_test`, which they create and drop themselves. They never read or change `employee_management`.
