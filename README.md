# Cose da fare (Django todo app)

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
