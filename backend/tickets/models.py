from django.db import models
from users.models import Employee

class Ticket(models.Model):
    CATEGORY_CHOICES = [
        ('Billing', 'Billing'), ('Bug', 'Bug'), ('Access', 'Access'), 
        ('HR', 'HR'), ('Server', 'Server'), ('DB', 'DB'), ('Feature', 'Feature'), ('Other', 'Other')
    ]
    SEVERITY_CHOICES = [
        ('Critical', 'Critical'), ('High', 'High'), ('Medium', 'Medium'), ('Low', 'Low')
    ]
    STATUS_CHOICES = [
        ('New', 'New'), ('Assigned', 'Assigned'), ('In Progress', 'In Progress'),
        ('Pending Info', 'Pending Info'), ('Resolved', 'Resolved'), ('Closed', 'Closed')
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Other')
    summary = models.TextField(blank=True, null=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='Low')
    predicted_department = models.CharField(max_length=50, blank=True, null=True)
    sentiment = models.CharField(max_length=50, blank=True, null=True)
    confidence_score = models.FloatField(blank=True, null=True)
    estimated_resolution_time = models.CharField(max_length=50, blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='New')
    assignee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets')
    auto_resolved = models.BooleanField(default=False)
    helpful_flag = models.BooleanField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class TicketHistory(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='history')
    action = models.CharField(max_length=255)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
