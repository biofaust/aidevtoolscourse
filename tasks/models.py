from django.db import models


class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = "low", "Bassa"
        MEDIUM = "medium", "Media"
        HIGH = "high", "Alta"

    title = models.CharField("Titolo", max_length=255)
    description = models.TextField("Descrizione", blank=True)
    is_completed = models.BooleanField(default=False)
    priority = models.CharField(
        "Priorità",
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    due_at = models.DateTimeField("Scadenza", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [
            "is_completed",
            models.F("due_at").asc(nulls_last=True),
            "priority",
            "-created_at",
        ]

    def __str__(self) -> str:
        return self.title
