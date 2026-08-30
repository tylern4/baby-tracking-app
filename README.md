# Baby Tracking App

Track your baby's eating, sleeping, and diapers with your partner. Two-person
login, a fast entry form, and a month-at-a-glance calendar. Works on laptop
and phone screens.

![Calendar view](./docs/screenshots/calendar.png)

## First-time setup

Follow these steps to get the app running on a fresh machine. You'll need
**Docker** with **Docker Compose** (included with Docker Desktop, or install
the compose plugin for the Docker engine on Linux).

### 1. Get the code

```bash
git clone git@github.com:tylern4/baby-tracking-app.git
cd baby-tracking-app
```

### 2. Create your configuration

Copy the example environment file and edit it before going live:

```bash
cp .env.example .env
```

Open `.env` and set:

| Variable        | What it's for                                                        |
|-----------------|----------------------------------------------------------------------|
| `POSTGRES_USER` | Database username (default `baby` is fine)                           |
| `POSTGRES_PASSWORD` | Database password. Change it for anything other than local use.  |
| `POSTGRES_DB`   | Database name (default `baby` is fine)                               |
| `JWT_SECRET`    | **Secret used to sign login tokens. Set a long random string.**      |
| `INVITE_CODE`   | **Private code required to register. Set something secret and share it only with your partner.** |

Generate a random value with e.g. `openssl rand -hex 32`.

### 3. Start the services

```bash
docker compose up --build -d
```

The first build takes a minute or two. When it finishes, three containers are
running:

| Service    | Container name | Address               |
|------------|----------------|-----------------------|
| Database   | `baby-db`      | `localhost:5432`      |
| Backend    | `baby-backend` | `localhost:8000`      |
| Frontend   | `baby-frontend`| http://localhost:8080 |

The containers restart automatically if they crash or when the host reboots
(`restart: unless-stopped`), so as long as Docker starts on boot the app comes
right back up. Check status any time with `docker compose ps`.

### 4. Create the admin account

Open http://localhost:8080/register in your browser and sign up:

- Your **name** and **email** — keep `email` something your partner can
  remember, it's your login.
- A **password** (bcrypt-hashed on the server).
- The **invite code** from your `.env`.

**The first account to register becomes the administrator** and is activated
immediately. Anyone else can only create an account if they know the invite
code.

### 5. Invite your partner

Register a second account the same way (on another device or in a private
window), using the same invite code. That account starts as **pending** — it
cannot log in until you approve it.

Sign in as the admin, open the **Admin** page, and click **Allow** next to
your partner's account. They can now log in too.

### 6. Start tracking

On the calendar, tap any day, then press **Add** to record an entry. Choose
**Feed**, **Sleep**, or **Diaper**, set the date and time (times snap to
15-minute increments), and save. It's a shared calendar — every entry is
visible to both of you.

---

## Features

- **Secure two-person login** — accounts are created with a private invite
  code, passwords are bcrypt-hashed, and access is via short-lived JWTs.
  The first account to register becomes the admin and approves later
  sign-ups. Both partners share the same calendar and entries, with roles
  controlling who can edit (admin/user) versus view only (read-only).
  As an admin you can also reset a forgotten password or delete an account
  (with confirmation) from the Admin page.
- **Fast tracking** — add a feed, sleep, or diaper in a couple of taps; edit
  or delete any entry from the day panel. Sleep entries can be left open
  ("still sleeping") and the summary counts them up to the present. Diaper
  entries include a stool-color scale (yellow, green, brown, and shades of
  each) alongside wet/dirty flags.
- **15-minute time increments** — every entry's time picker only offers
  minutes that fall on the quarter hour (`:00`, `:15`, `:30`, `:45`), so
  times stay consistent and easy to read. The field layout (date + hour +
  minute) is fully responsive and works the same on iOS and desktop.
- **Calendar view** — month grid summarizing each day's feed count/volume,
  sleep total, and diaper count, with a detailed list for any day you tap.

  ![Day panel](./docs/screenshots/day-panel.png)

- **Entry form** — one form for all three entry types with a note field on
  every entry.

  ![Entry form](./docs/screenshots/entry-form.png)
- **Statistics** — interactive charts summarizing feeds, sleep, and diapers
  over 7/14/30/90-day windows with a date range picker.

  ![Statistics](./docs/screenshots/stats.png)
- **Admin page** — manage the two-person account list: approve/deny pending
  sign-ups, switch roles between admin and read-only, reset passwords, or
  delete accounts.

  ![Admin page](./docs/screenshots/admin.png)
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
service defined inline in `docker-compose.yml`). The backend API is available
directly at http://localhost:8000/api with Swagger docs at
http://localhost:8000/docs. The frontend nginx container proxies `/api/`
requests to the backend and serves hashed static assets with long-lived cache
headers (the HTML shell is never cached, so clients always pick up new
bundles).

## Configuration

Everything is configured through environment variables in `.env` (see
`.env.example`). The critical ones for a real deployment are a strong
`JWT_SECRET` and a private `INVITE_CODE`.

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