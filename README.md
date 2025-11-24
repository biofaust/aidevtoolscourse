# Cose da fare (Django todo app) (English below)

Una semplice app Todo in Django con CRUD, priorità, scadenze e conferma di eliminazione via modal.

## Requisiti
- Python 3.12+
- Virtualenv consigliato

## Setup
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # se non hai il file, puoi usare: pip install Django
python manage.py migrate
```

## Avvio sviluppo
```bash
source .venv/bin/activate
python manage.py runserver
```
Apri `http://127.0.0.1:8000/` per usare l'app. Vai su `/admin` per l'admin (crea prima un superuser con `python manage.py createsuperuser`).

## Test
```bash
source .venv/bin/activate
python manage.py test
```

## Struttura
- `cosedafare/`: configurazione del progetto (settings, urls, wsgi/asgi).
- `tasks/`: app con modello `Task`, viste/class-based views, form, URL, template e test.
- `tasks/templates/`: base layout e pagine per elenco, form e conferma eliminazione (modal).

---

# Cose da fare (English)

Simple Django Todo app with CRUD, priorities, due dates, and modal delete confirmation.

## Requirements
- Python 3.12+
- Virtualenv recommended

## Setup
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # or pip install Django if requirements.txt is missing
python manage.py migrate
```

## Run (dev)
```bash
source .venv/bin/activate
python manage.py runserver
```
Open `http://127.0.0.1:8000/` to use the app. Admin at `/admin` (create a superuser first with `python manage.py createsuperuser`).

## Tests
```bash
source .venv/bin/activate
python manage.py test
```

## Structure
- `cosedafare/`: project config (settings, urls, wsgi/asgi).
- `tasks/`: app with `Task` model, class-based views, form, URLs, templates, and tests.
- `tasks/templates/`: base layout plus list, form, and delete confirmation (modal).
