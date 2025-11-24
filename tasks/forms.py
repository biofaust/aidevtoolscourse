from django import forms

from .models import Task


class TaskForm(forms.ModelForm):
    class Meta:
        model = Task
        fields = ["title", "description", "priority", "due_at"]
        labels = {
            "title": "Titolo",
            "description": "Descrizione",
            "priority": "Priorità",
            "due_at": "Scadenza",
        }
        widgets = {
            "due_at": forms.DateTimeInput(attrs={"type": "datetime-local"}),
        }
