# Baby Tracking App

Track your baby's eating, sleeping, and diapers with your partner. Two-person
login, a fast entry form, and a month-at-a-glance calendar. Works on laptop
and phone screens.

## Features

- **Secure two-person login** — accounts are created with a private invite
  code, passwords are bcrypt-hashed, and access is via short-lived JWTs.
  The first account to register becomes the admin and approves later
  sign-ups. Both partners share the same calendar and entries, with roles
  controlling who can edit (admin/user) versus view only (read-only).
- **Fast tracking** — add a feed, sleep, or diaper in a couple of taps; edit
  or delete any entry from the day panel. Sleep entries can be left open
  ("still sleeping") and the summary counts them up to the present. Diaper
  entries include a stool-color scale (yellow, green, brown, and shades of
  each) alongside wet/dirty flags.
- **Calendar view** — month grid summarizing each day's feed count/volume,
  sleep total, and diaper count, with a detailed list for any day you tap.
- **Dark mode** — toggle in the top bar; your choice is remembered and the
  app follows your system preference on first visit.
- **Responsive** — the same UI adapts to desktop and mobile.

## Architecture

Three containers orchestrated with Docker Compose:

| Service  | Tech                                  | Port      |
|----------|---------------------------------------|-----------|
| `db`     | PostgreSQL 16                         | 5432      |
| `backend`| Python (FastAPI + SQLAlchemy)         | 8000      |
| `frontend`| React (Vite + TypeScript), served by nginx | 8080 |

Each service has its own directory (`backend/`, `frontend/`, plus the `db`
service defined inline in `docker-compose.yml`).

## Run it

```bash
cp .env.example .env
docker compose up --build
```

Then open http://localhost:8080.

- **Register** your first account (you) with the invite code from `.env`
  (`bumblebee` by default). That account is the admin. Register again as your
  wife, then approve her account from the Admin page. Only people who know
  the invite code can create accounts.
- **Log in** to see the calendar. Click any day to view and add entries.
- The backend API is also available directly at http://localhost:8000/api
  (Swagger docs at http://localhost:8000/docs).

## Configuration

Everything is configured through environment variables in `.env` (see
`.env.example`). Most importantly set a strong `JWT_SECRET` and a private
`INVITE_CODE` before deploying anywhere.

## Data model

- `users` — you and your wife (email, name, bcrypt password hash).
- `entries` — a single flexible table for all tracking. Each entry has a
  `type` (`feed`, `sleep`, or `diaper`), a start/end time, an optional note,
  and a `details` JSON column that holds type-specific fields so new tracking
  types are trivial to add.

## Development

Run the backend locally:

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
DATABASE_URL=postgresql+psycopg://baby:baby@localhost:5432/baby \
JWT_SECRET=dev INVITE_CODE=bumblebee uvicorn src.main:app --reload
```

Run the frontend locally (uses a dev proxy to `http://localhost:8000`):

```bash
cd frontend
npm install
npm run dev
```

Database tables are managed with **Alembic migrations** and applied
automatically on backend startup. To create a new migration after changing a
model:

```bash
docker compose exec backend alembic revision --autogenerate -m "describe change"
```

Review the generated file in `backend/alembic/versions/`, then restart the
backend (`docker compose restart backend`) to apply it. The schema is checked
for drift with `compare_type`, so column type changes are picked up too.

The initial migration (`0001_initial.py`) is safe to apply on a database that
was previously created by the old `create_all` startup — it skips tables that
already exist.

## Testing

Backend tests use pytest against a disposable Postgres database:

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

Frontend tests use Vitest and React Testing Library:

```bash
cd frontend
npm install
npm test
```

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs both suites on
every push and pull request, then builds and pushes the `backend` and
`frontend` container images to GitHub Container Registry.
