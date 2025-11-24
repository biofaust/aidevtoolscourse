from datetime import datetime, timedelta, timezone

from django.test import Client, TestCase
from django.urls import reverse

from .forms import TaskForm
from .models import Task


class TaskModelTests(TestCase):
    def test_str_returns_title(self):
        task = Task.objects.create(title="Buy milk")
        self.assertEqual(str(task), "Buy milk")

    def test_defaults_and_choices(self):
        task = Task.objects.create(title="Default task")
        self.assertFalse(task.is_completed)
        self.assertEqual(task.priority, Task.Priority.MEDIUM)
        self.assertIsNone(task.due_at)

    def test_ordering_incomplete_first_then_due_date_then_priority_then_created(self):
        now = datetime.now(timezone.utc)
        t1 = Task.objects.create(title="Completed later", is_completed=True, created_at=now - timedelta(minutes=1))
        t2 = Task.objects.create(title="Due soon", due_at=now + timedelta(hours=1), priority=Task.Priority.HIGH)
        t3 = Task.objects.create(title="No due date", priority=Task.Priority.LOW)
        tasks = list(Task.objects.all())
        self.assertEqual(tasks, [t2, t3, t1])


class TaskFormTests(TestCase):
    def test_due_at_widget_is_datetime_local(self):
        form = TaskForm()
        self.assertIn('type="datetime-local"', str(form["due_at"]))

    def test_title_required_validation(self):
        form = TaskForm(data={"title": "", "priority": Task.Priority.MEDIUM})
        self.assertFalse(form.is_valid())
        self.assertIn("title", form.errors)


class TaskViewTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_list_view_renders(self):
        url = reverse("tasks:list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "tasks/task_list.html")
        self.assertIn("form", response.context)

    def test_list_view_shows_tasks_in_order(self):
        now = datetime.now(timezone.utc)
        completed = Task.objects.create(title="later", is_completed=True, created_at=now - timedelta(minutes=1))
        t2 = Task.objects.create(title="soon", due_at=now + timedelta(minutes=10), priority=Task.Priority.HIGH)
        t3 = Task.objects.create(title="low", priority=Task.Priority.LOW)
        response = self.client.get(reverse("tasks:list"))
        tasks = list(response.context["tasks"])
        self.assertEqual(tasks, [t2, t3, completed])

    def test_create_view_creates_task_and_redirects(self):
        data = {
            "title": "New task",
            "description": "Something to do",
            "priority": Task.Priority.HIGH,
        }
        response = self.client.post(reverse("tasks:create"), data)
        self.assertRedirects(response, reverse("tasks:list"))
        self.assertTrue(Task.objects.filter(title="New task").exists())

    def test_create_view_invalid_re_renders(self):
        response = self.client.post(reverse("tasks:create"), {"title": ""})
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "tasks/task_form.html")
        self.assertFalse(Task.objects.exists())

    def test_update_view_updates_task(self):
        task = Task.objects.create(title="Old", description="desc")
        response = self.client.post(
            reverse("tasks:update", args=[task.pk]),
            {"title": "Updated", "description": "new", "priority": Task.Priority.LOW},
        )
        self.assertRedirects(response, reverse("tasks:list"))
        task.refresh_from_db()
        self.assertEqual(task.title, "Updated")
        self.assertEqual(task.priority, Task.Priority.LOW)

    def test_delete_view_deletes_task(self):
        task = Task.objects.create(title="Delete me")
        response = self.client.post(reverse("tasks:delete", args=[task.pk]))
        self.assertRedirects(response, reverse("tasks:list"))
        self.assertFalse(Task.objects.filter(pk=task.pk).exists())

    def test_delete_view_404_for_missing(self):
        response = self.client.post(reverse("tasks:delete", args=[999]))
        self.assertEqual(response.status_code, 404)

    def test_toggle_complete_flips_flag(self):
        task = Task.objects.create(title="Toggle me")
        response = self.client.post(reverse("tasks:toggle_complete", args=[task.pk]))
        self.assertRedirects(response, reverse("tasks:list"))
        task.refresh_from_db()
        self.assertTrue(task.is_completed)

    def test_toggle_complete_404_for_missing(self):
        response = self.client.post(reverse("tasks:toggle_complete", args=[999]))
        self.assertEqual(response.status_code, 404)


class TaskAdminTests(TestCase):
    def test_task_registered_in_admin(self):
        from django.contrib import admin

        self.assertIn(Task, admin.site._registry)
