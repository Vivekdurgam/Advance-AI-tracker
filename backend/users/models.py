from django.db import models

class Employee(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    department = models.CharField(max_length=50)
    role = models.CharField(max_length=50)
    skill_tags = models.CharField(max_length=255, help_text="Comma separated skills")
    avg_resolution_time = models.FloatField(default=0.0)
    current_load = models.IntegerField(default=0)
    availability_status = models.CharField(max_length=20, choices=[('Available', 'Available'), ('Busy', 'Busy'), ('On Leave', 'On Leave')], default='Available')

    def __str__(self):
        return f"{self.name} - {self.department}"
