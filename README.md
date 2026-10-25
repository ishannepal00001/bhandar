# Bhandar

A personal Facebook video downloader. Paste a link, pick a quality, and Bhandar downloads the video with `yt-dlp`, stores it in Backblaze B2 and keeps a searchable history. Only the owner can get in: login takes a password and a one-time code sent by email.

> **Status:** the backend is being rebuilt module by module. The auth module (OTP login, JWT cookie, logout, IP rate limits) is done and runs on Cloudflare Workers. The downloads module is scaffolded but empty for now; the earlier working downloader is kept in `backend/legacy/` for reference, and `yt-dlp` will move to a separate Python service. The frontend still renders dummy data.

## Stack

| Part | Tech |
|---|---|
| Backend | [Hono](https://hono.dev) on [Cloudflare Workers](https://developers.cloudflare.com/workers/), [Kysely](https://kysely.dev) on D1, Zod, Nodemailer (`nodejs_compat`), aws4fetch for B2 |
| Frontend | React 19, Vite, TanStack Router, Zustand, Tailwind CSS, lucide-react |
| Shared | Zod request schema builders in `schemas/`, given their lengths from the backend's vars |
| External | `yt-dlp` + `ffmpeg` for downloads, Backblaze B2 for storage, an SMTP server for login codes |

## Layout

```
bhandar/
├── schemas/              Zod request schemas shared by backend and frontend
├── backend/
│   ├── wrangler.jsonc    Worker config: every var, secret names, D1, rate limits
│   ├── migrations/       D1 schema and the login user seed, applied with wrangler
│   ├── src/
│   │   ├── index.ts      Hono app, mounts the api/v1 routers, error handling
│   │   ├── db.ts         Kysely on the BHANDAR_DB D1 binding
│   │   ├── api/v1/       routes: parse the request, return JSON
│   │   ├── modules/<name>/
│   │   │   ├── controller.ts   validation against schemas/
│   │   │   ├── service.ts      business logic
│   │   │   ├── model.ts        database access
│   │   │   ├── utils.ts        helpers (hashing, JWT, mail, ...)
│   │   │   └── type.ts         shared types
│   │   └── core/
│   │       ├── types.ts          re-exports every *.types.ts in core/
│   │       ├── middlewares/
│   │       │   ├── isUser.ts     guards routes with the auth cookie
│   │       │   └── rateLimit.ts  per-IP limits from the ratelimits bindings
│   │       └── utils/
│   │           └── storage.ts    Storage class for Backblaze B2 (upload, list, get, delete)
│   └── legacy/           previous downloader implementation, not mounted
└── frontend/
    └── src/              pages, routes, components, stores
```

In `core/`, each file's types sit next to it in `<name>.types.ts`.

Each layer has its own error class (`AuthModelError` → `AuthServiceError` → `AuthControllerError` → `AuthRouteError`), and each layer converts the one below it, so HTTP status codes are decided in one place.

## Getting started

### Requirements

- Bun 1.3+ (package manager; the API runs on Workers via Wrangler)
- A Cloudflare account for deploying
- An SMTP account for sending login codes
- For downloads: `yt-dlp` and `ffmpeg` on your `PATH`, and a private Backblaze B2 bucket with an application key

### Backend

```sh
cd backend
bun install
cp .dev.vars.example .dev.vars   # local secret values
cp migrations/0002_seed_user.sql.example migrations/0002_seed_user.sql   # fill in email and password hash
bun run db:migrate:local         # creates the tables and the login user in the local D1 database
bun run dev                      # http://127.0.0.1:8787
```

### Frontend

```sh
cd frontend
bun install
bun run dev              # Vite dev server; /api is proxied to the backend on :8787
```

## Configuration

All configuration is in `backend/wrangler.jsonc`; there is no `config.ts` or `.env`. Code reads it from the Worker bindings, either `import { env } from 'cloudflare:workers'` or `c.env` (`new Storage(c.env)`), never `process.env`. Vars hold real JSON types (numbers, booleans). `wrangler dev` regenerates `worker-configuration.d.ts` whenever `wrangler.jsonc` changes (`dev.generate_types`).

| Where | Keys | Purpose |
|---|---|---|
| `vars` | `OTP_LENGTH`, `OTP_TTL_MINUTES`, `OTP_MAIL_SUBJECT` | Login codes: digits, lifetime and email subject |
| `vars` | `PASSWORD_MIN_LENGTH`, `PASSWORD_SALT_BYTES` | Password rule and salt size |
| `vars` | `JWT_ALGORITHM`, `JWT_TTL_DAYS` | Login token signing and lifetime |
| `vars` | `COOKIE_NAME`, `COOKIE_SECURE`, `COOKIE_SAME_SITE` | The auth cookie |
| `vars` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `MAIL_FROM` | SMTP server for login codes (port `465` uses TLS) |
| `vars` | `B2_BUCKET`, `B2_ENDPOINT`, `B2_REGION`, `STORAGE_URL_TTL_SECONDS` | Backblaze B2 bucket, its S3 endpoint, and how long download links last |
| `secrets.required` | `JWT_SECRET`, `SMTP_PASS`, `B2_KEY_ID`, `B2_APP_KEY` | Names only. Values go in `.dev.vars` locally and `bunx wrangler secret put <NAME>` when deployed; `wrangler deploy` fails if one is missing |
| `d1_databases` | `BHANDAR_DB` → `bhandardb` | The database. Run `bunx wrangler d1 create bhandardb` once and put the printed id in `database_id` |
| `ratelimits` | `SEND_OTP_LIMITER` 3/min, `LOGIN_LIMITER` 5/min, `API_LIMITER` 60/10s | Per-IP limits. Cloudflare counts them per location and approximately |

The login user comes from `migrations/0002_seed_user.sql`. It is gitignored because it holds your email and password hash; the committed `.sql.example` shows how to generate the hash with `openssl` and `sha256sum`.

Passwords must be at least `PASSWORD_MIN_LENGTH` (8) characters and include an uppercase letter, a lowercase letter, a number and a symbol.

## How login works

1. `POST /api/v1/auth/send-otp` with the password. If it matches a user, a 6-digit code is emailed to that user. The code is stored as a SHA-256 hash and expires after 10 minutes. Passwords are stored as a salted SHA-256 hash.
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

`GET /health` (outside `/api`, not rate limited) returns `{ "status": "ok", "db": "ok" }`, or `503` with `"db": "unreachable"` when D1 can't be queried.

| Status | Meaning |
|---|---|
| 400 | Body is not JSON or fails validation |
| 429 | Too many requests from this IP |
| 401 | Wrong password, wrong or expired code, or not logged in |
| 502 | The login email could not be sent |
| 500 | Database or token error |

## Scripts

| Where | Command | Does |
|---|---|---|
| backend | `bun run dev` | Start the API locally with `wrangler dev` |
| backend | `bun run deploy` | Deploy the Worker |
| backend | `bun run cf-typegen` | Regenerate binding types without `wrangler dev` running (e.g. in CI) |
| backend | `bun run db:migrate:local` / `:remote` | Apply `migrations/` to D1, including the login user seed |
| backend | `bun test` | Run tests |
| backend | `bun run typecheck` | Type-check with `tsc` |
| frontend | `bun run dev` | Start the Vite dev server |
| frontend | `bun run build` | Type-check and build to `dist/` |
| frontend | `bun run lint` | Lint with oxlint |
| frontend | `bun run preview` | Serve the production build |
