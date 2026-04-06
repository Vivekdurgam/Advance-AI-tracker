from rest_framework import serializers
from .models import Ticket, TicketHistory
from users.serializers import EmployeeSerializer


class TicketHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketHistory
        fields = "__all__"


class TicketSerializer(serializers.ModelSerializer):
    history = TicketHistorySerializer(many=True, read_only=True)
    assignee_details = EmployeeSerializer(source="assignee", read_only=True)

    class Meta:
        model = Ticket
        fields = "__all__"
        read_only_fields = (
            "category",
            "summary",
            "severity",
            "predicted_department",
            "sentiment",
            "confidence_score",
            "estimated_resolution_time",
            "auto_resolved",
            "helpful_flag",
            "assignee",
            "created_at",
            "updated_at",
        )


class TicketCreateInputSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, trim_whitespace=True)
    description = serializers.CharField(trim_whitespace=True)
