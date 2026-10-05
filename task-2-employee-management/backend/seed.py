"""Optional sample data for development and testing.

    python seed.py           add the sample employees if the collection is empty
    python seed.py --reset   delete all employees first, then add the samples
"""
import sys

from app import app
from database.mongo import get_employees_collection
from models.employee import validate_employee

SAMPLE_EMPLOYEES = [
    {"name": "Mimansa Patle", "department": "Engineering", "role": "Senior Software Engineer", "salary": 1850000, "joinDate": "2021-03-15"},
    {"name": "Priya Nair", "department": "Human Resources", "role": "HR Business Partner", "salary": 1120000, "joinDate": "2020-08-01"},
    {"name": "Rohan Desai", "department": "Finance", "role": "Financial Analyst", "salary": 960000, "joinDate": "2023-01-09"},
    {"name": "Ananya Iyer", "department": "Marketing", "role": "Content Strategist", "salary": 840000, "joinDate": "2022-06-20"},
    {"name": "Kabir Singh", "department": "Sales", "role": "Account Executive", "salary": 1010000, "joinDate": "2024-02-12"},
    {"name": "Meera Joshi", "department": "Engineering", "role": "QA Engineer", "salary": 780000, "joinDate": "2023-09-04"},
    {"name": "Vikram Rao", "department": "Operations", "role": "Operations Manager", "salary": 1430000, "joinDate": "2019-11-18"},
    {"name": "Isha Kapoor", "department": "Engineering", "role": "Frontend Developer", "salary": 1240000, "joinDate": "2022-10-03"},
    {"name": "Dev Patel", "department": "Finance", "role": "Accounts Payable Specialist", "salary": 620000, "joinDate": "2025-04-21"},
    {"name": "Sana Sheikh", "department": "Marketing", "role": "Growth Marketer", "salary": 990000, "joinDate": "2024-07-08"},
    {"name": "Arjun Pillai", "department": "Sales", "role": "Sales Development Rep", "salary": 540000, "joinDate": "2025-12-01"},
    {"name": "Neha Kulkarni", "department": "Operations", "role": "Logistics Coordinator", "salary": 680000, "joinDate": "2026-06-12"},
]


def seed(reset=False):
    with app.app_context():
        collection = get_employees_collection()
        if reset:
            removed = collection.delete_many({}).deleted_count
            print(f"Removed {removed} existing employees.")
        elif collection.count_documents({}) > 0:
            print("The employees collection already has data. Use --reset to replace it.")
            return

        documents = []
        for sample in SAMPLE_EMPLOYEES:
            clean, errors = validate_employee(sample)
            if errors:
                raise SystemExit(f"Invalid sample employee {sample['name']}: {errors}")
            documents.append(clean)

        collection.insert_many(documents)
        print(f"Added {len(documents)} sample employees.")


if __name__ == "__main__":
    seed(reset="--reset" in sys.argv)
