"""
URL configuration for ticketing_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.db import connection
from django.http import JsonResponse
from django.urls import include, path


def health_check(_request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return JsonResponse({"status": "ok", "database": "ok"}, status=200)
    except Exception as exc:
        return JsonResponse({"status": "error", "database": "down", "detail": str(exc)}, status=503)


def root_status(_request):
    return JsonResponse({"service": "ticketing-backend", "status": "ok"}, status=200)

urlpatterns = [
    path("", root_status),
    path("health/", health_check),
    path("api/health/", health_check),
    path("admin/", admin.site.urls),
    path("api/", include("tickets.urls")),
    path("api/", include("users.urls")),
]
