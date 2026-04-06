import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketing_backend.settings')
django.setup()

from users.models import Employee

DEPARTMENTS = ['Engineering', 'Finance', 'HR', 'IT', 'Product', 'Marketing', 'Legal']
SKILLS = ['Database', 'Payroll', 'Networking', 'Python', 'React', 'Legal Compliance', 'Content']

def populate():
    Employee.objects.all().delete()
    for i in range(1, 15):
        dept = random.choice(DEPARTMENTS)
        skill = random.choice(SKILLS)
        Employee.objects.create(
            name=f"Employee {i}",
            email=f"emp{i}@company.com",
            department=dept,
            role="Specialist",
            skill_tags=skill,
            avg_resolution_time=round(random.uniform(1.0, 5.0), 1),
            current_load=random.randint(0, 5),
            availability_status=random.choice(['Available', 'Available', 'Available', 'Busy', 'On Leave'])
        )
    print("Populated dummy employees.")

if __name__ == '__main__':
    populate()
