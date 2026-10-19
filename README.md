# Bhandar

A personal Facebook video downloader. Paste a link, pick a quality, and Bhandar downloads the video with `yt-dlp`, stores it in Backblaze B2 and keeps a searchable history. Only the owner can get in: login takes a password and a one-time code sent by email.

> **Status:** the backend is being rebuilt module by module. The auth module (OTP login, JWT cookie, logout) is done. The downloads module is scaffolded but empty for now; the earlier working downloader is kept in `backend/legacy/` for reference. The frontend still renders dummy data.

## Stack

| Part | Tech |
|---|---|
| Backend | [Bun](https://bun.sh), [Hono](https://hono.dev), [Kysely](https://kysely.dev) on SQLite, Zod, Nodemailer |
| Frontend | React 19, Vite, TanStack Router, Zustand, Tailwind CSS, lucide-react |
| Shared | Zod request schemas in `schemas/`, used by the backend (and later the frontend) |
| External | `yt-dlp` + `ffmpeg` for downloads, Backblaze B2 for storage, an SMTP server for login codes |

## Layout

```
bhandar/
├── schemas/              Zod request schemas shared by backend and frontend
├── backend/
│   ├── config.ts         every constant and env read lives here
│   ├── src/
│   │   ├── index.ts      Hono app, mounts the api/v1 routers, error handling
│   │   ├── db.ts         Kysely + bun:sqlite, table migrations
│   │   ├── seed.ts       creates the login user
│   │   ├── api/v1/       routes: parse the request, return JSON
│   │   ├── modules/<name>/
│   │   │   ├── controller.ts   validation against schemas/
│   │   │   ├── service.ts      business logic
│   │   │   ├── model.ts        database access
│   │   │   ├── utils.ts        helpers (hashing, JWT, mail, ...)
│   │   │   └── type.ts         shared types
│   │   └── utils/middlewares/isUser.ts   guards routes with the auth cookie
│   └── legacy/           previous downloader implementation, not mounted
└── frontend/
    └── src/              pages, routes, components, stores
```

Each layer has its own error class (`AuthModelError` → `AuthServiceError` → `AuthControllerError` → `AuthRouteError`), and each layer converts the one below it, so HTTP status codes are decided in one place.

## Getting started

### Requirements

- Bun 1.3+
- An SMTP account for sending login codes
- For downloads: `yt-dlp` and `ffmpeg` on your `PATH`, and a private Backblaze B2 bucket with an application key

### Backend

```sh
cd backend
bun install
cp .env.example .env     # fill in the values, see below
bun run seed             # creates the login user from SEED_EMAIL / SEED_PASSWORD
bun run dev              # http://127.0.0.1:3000
```

### Frontend

```sh
cd frontend
bun install
bun run dev              # Vite dev server; /api is proxied to the backend on :3000
```

## Configuration

Tunable values (OTP length and lifetime, bcrypt cost, JWT lifetime, cookie name, ...) are in `backend/config.ts`. Secrets and machine-specific values come from `backend/.env`:

| Variable | Purpose |
|---|---|
| `PORT` | Port the API listens on (default `3000`) |
| `DATA_DIR` | Folder for the SQLite database (default `./data`) |
| `JWT_SECRET` | Signs login tokens. Use a long random string, e.g. `openssl rand -base64 48` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP server for login codes (port `465` uses TLS) |
| `MAIL_FROM` | Sender address on the login email |
| `SEED_EMAIL`, `SEED_PASSWORD` | Used by `bun run seed` to create the user |
| `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET`, `B2_ENDPOINT`, `B2_REGION` | Backblaze B2 storage, for the downloads module |
| `MAX_CONCURRENT` | How many downloads run at once, for the downloads module |

Passwords must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol.

## How login works

1. `POST /api/v1/auth/send-otp` with the password. If it matches a user, a 6-digit code is emailed to that user. The code is stored bcrypt-hashed and expires after 10 minutes.
2. `POST /api/v1/auth/login` with the code. A valid code is used up, and the response sets an `httpOnly` `bhandar_token` cookie holding a JWT valid for 7 days.
3. Protected routes use the `isUser` middleware, which checks the cookie and puts the user on `c.var.user`.
4. `POST /api/v1/auth/logout` clears the cookie.

## API

All routes are under `/api/v1`. Errors come back as `{ "error": "...", "issues"?: { field: [messages] } }`.

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/send-otp` | `{ "password": string }` | `{ "sent": true }` |
| POST | `/auth/login` | `{ "code": "123456" }` | `{ "token": string }` + auth cookie |
| POST | `/auth/logout` | none | `{ "loggedOut": true }` |

| Status | Meaning |
|---|---|
| 400 | Body is not JSON or fails validation |
| 401 | Wrong password, wrong or expired code, or not logged in |
| 502 | The login email could not be sent |
| 500 | Database or token error |

## Scripts

| Where | Command | Does |
|---|---|---|
| backend | `bun run dev` | Start the API and restart on changes |
| backend | `bun run start` | Start the API |
| backend | `bun run seed` | Create or update the login user |
| backend | `bun test` | Run tests |
| backend | `bun run typecheck` | Type-check with `tsc` |
| frontend | `bun run dev` | Start the Vite dev server |
| frontend | `bun run build` | Type-check and build to `dist/` |
| frontend | `bun run lint` | Lint with oxlint |
| frontend | `bun run preview` | Serve the production build |
