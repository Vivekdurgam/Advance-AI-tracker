# Advanced AI Ticketing System

Production-ready full-stack ticketing system with:
- React + Vite frontend
- Django REST backend
- SQLite persistence (with WAL tuning and backup script)

## 1. Environment Setup

Copy the templates:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

### Frontend env (`.env`)

- `VITE_API_BASE_URL` default `/api`
- `VITE_API_TIMEOUT_MS` request timeout in ms
- `VITE_BACKEND_PROXY_TARGET` local dev proxy target for Vite dev server
- `VITE_SUPABASE_*` optional Supabase values

### Backend env (`backend/.env`)

- `SECRET_KEY` required in production
- `DEBUG=False` for production
- `ALLOWED_HOSTS` comma-separated hosts
- `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`
- `DATABASE_URL` enables PostgreSQL (recommended for Render production)
- `SQLITE_PATH` path is used only when `DATABASE_URL` is not set
- `GROK_API_KEY` optional; if missing, app falls back to mock AI analysis
- `GROK_MODEL`, `GROK_API_BASE_URL`, and optional `GROK_FALLBACK_MODELS` for local/production provider routing

## 2. Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend health check: `http://127.0.0.1:8000/health/`

### Frontend

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api` calls to `VITE_BACKEND_PROXY_TARGET`.

## 3. Production Deployment (No Docker)

### Backend (Gunicorn)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput
gunicorn ticketing_backend.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 60
```

### Frontend (static build)

```bash
npm install
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

In production, serve `dist/` using any static web server and reverse proxy `/api` to Django.

What is production-hardened:
- Env-driven Django config (no hardcoded production secret/debug)
- Secure middleware + strict headers + HSTS defaults
- WhiteNoise static serving + `collectstatic`
- Gunicorn WSGI runtime
- API throttling and stricter request validation
- PostgreSQL via `DATABASE_URL` (with SQLite fallback for local/dev)

## 4. SQLite Backup

Run a consistent SQLite backup (safe while app is online):

```bash
cd backend
python backup_sqlite.py
```

Optional env for backups:
- `SQLITE_BACKUP_DIR` (default `backend/data/backups`)

## 5. Notes

- Rotate old secrets before deploying publicly.
- SQLite is suitable for small/medium workloads; for high concurrency, migrate to PostgreSQL.
