# Bhandar

A personal Facebook video downloader. Paste a link and Bhandar downloads the video with `yt-dlp`, stores it in Backblaze B2 and keeps a searchable history. Only the owner can get in: login takes a password and a one-time code sent by email.

> **Status:** the backend is being rebuilt module by module. The auth module (OTP login, JWT cookie, logout, IP rate limits) is done and runs on Cloudflare Workers. The downloads module is done on the Worker side: it queues jobs on a separate Python service on Render, polls it from a Durable Object and pushes final states over SSE. The Render service itself isn't built yet (its contract is below), and the earlier downloader is kept in `backend/legacy/` for reference. The frontend still renders dummy data.

## Stack

| Part | Tech |
|---|---|
| Backend | [Hono](https://hono.dev) on [Cloudflare Workers](https://developers.cloudflare.com/workers/), D1 (its own API, no query builder), a Durable Object, Zod, Nodemailer (`nodejs_compat`), aws4fetch for B2 |
| Frontend | React 19, Vite, TanStack Router, Zustand, Tailwind CSS, lucide-react |
| Shared | Zod request schema builders in `schemas/`, given their lengths from the backend's vars |
| External | A Python service on Render running `yt-dlp` + `ffmpeg`, Backblaze B2 for storage, an SMTP server for login codes |

## Layout

```
bhandar/
├── schemas/              Zod request schemas shared by backend and frontend
├── backend/
│   ├── wrangler.jsonc    Worker config: every var, secret names, D1, rate limits
│   ├── migrations/       D1 schema and the login user seed, applied with wrangler
│   ├── src/
│   │   ├── index.ts      Hono app, mounts the api/v1 routers, error handling
│   │   ├── api/v1/       routes: parse the request, return JSON
│   │   ├── modules/<name>/
│   │   │   ├── controller.ts   validation against schemas/
│   │   │   ├── service.ts      business logic
│   │   │   ├── model.ts        SQL on the BHANDAR_DB D1 binding
│   │   │   ├── utils.ts        helpers (hashing, JWT, mail, fetchr endpoints, ...)
│   │   │   └── tracker.ts      (downloads) DownloadTracker Durable Object
│   │   └── core/
│   │       ├── types.ts          re-exports every *.types.ts in core/
│   │       ├── middlewares/
│   │       │   ├── fetchr.ts     signs requests to fetchr and keeps its rolling code
│   │       │   ├── isUser.ts     guards routes with the auth cookie
│   │       │   └── rateLimit.ts  per-IP limits from the ratelimits bindings
│   │       └── utils/
│   │           └── storage.ts    Storage class for Backblaze B2 (upload, list, get, delete)
│   └── legacy/           previous downloader implementation, not mounted
└── frontend/
    └── src/              pages, routes, components, stores
```

Each file's types sit next to it in `<name>.types.ts` and its error class in `<name>.error.ts` (e.g. `service.ts`, `service.types.ts`, `service.error.ts`). `core/types.ts` re-exports the core ones.

Each layer has its own error class (for example `AuthModelError` → `AuthServiceError` → `AuthControllerError` → `AuthRouteError`, and the same chain for downloads), and each layer converts the one below it, so HTTP status codes are decided in one place.

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
| `vars` | `DOWNLOADER_URL`, `DOWNLOADER_TIMEOUT_SECONDS` | The Render download service's origin (e.g. `https://bhandar-downloader.onrender.com`) and the per-request timeout |
| `vars` | `DOWNLOAD_POLL_SECONDS`, `DOWNLOAD_MAX_POLL_FAILURES`, `DOWNLOAD_TRACKER_NAME`, `SSE_HEARTBEAT_SECONDS` | How often the tracker polls Render, how many failed polls in a row mark a job failed, the tracker instance's name, and the SSE keep-alive interval |
| `vars` | `DOWNLOAD_ALLOWED_HOSTS` | Hosts a download link may use (Facebook and `fb.watch`) |
| `secrets.required` | `JWT_SECRET`, `SMTP_PASS`, `B2_KEY_ID`, `B2_APP_KEY`, `DOWNLOADER_API_KEY` | Names only. Values go in `.dev.vars` locally and `bunx wrangler secret put <NAME>` when deployed; `wrangler deploy` fails if one is missing |
| `d1_databases` | `BHANDAR_DB` → `bhandardb` | The database. Run `bunx wrangler d1 create bhandardb` once and put the printed id in `database_id` |
| `durable_objects` | `DOWNLOAD_TRACKER` → `DownloadTracker` | The download poller (SQLite-backed, so it runs on the free plan) |
| `ratelimits` | `SEND_OTP_LIMITER` 3/min, `LOGIN_LIMITER` 5/min, `API_LIMITER` 60/10s | Per-IP limits. Cloudflare counts them per location and approximately |

The login user comes from `migrations/0002_seed_user.sql`. It is gitignored because it holds your email and password hash; the committed `.sql.example` shows how to generate the hash with `openssl` and `sha256sum`.

Passwords must be at least `PASSWORD_MIN_LENGTH` (8) characters and include an uppercase letter, a lowercase letter, a number and a symbol.

## How login works

1. `POST /api/v1/auth/send-otp` with the password. If it matches a user, a 6-digit code is emailed to that user. The code is stored as a SHA-256 hash and expires after 10 minutes. Passwords are stored as a salted SHA-256 hash.
2. `POST /api/v1/auth/login` with the code. A valid code is used up, and the response sets an `httpOnly` `bhandar_token` cookie holding a JWT valid for 7 days.
3. Protected routes use the `isUser` middleware, which checks the cookie and puts the user on `c.var.user`.
4. `POST /api/v1/auth/logout` clears the cookie.

## How downloads work

The Worker never handles video bytes. A Python service on Render runs `yt-dlp`, uploads the file to B2 with its own credentials, and reports back when asked.

1. `POST /api/v1/downloads` with a Facebook link. The Worker asks Render to queue it and returns `202` with the queued job right away, so the app stays usable while the download runs.
2. The job is handed to the **DownloadTracker**, a Durable Object: a small stateful Worker that can keep storage and set alarms. There is one instance for the whole app, named by `DOWNLOAD_TRACKER_NAME`. Cloudflare starts it the first time it's addressed and unloads it when it's idle.
3. While any job is queued, the tracker's alarm polls Render every `DOWNLOAD_POLL_SECONDS` (8 s), sending back the latest `next_code`.
4. When Render reports `completed`, `failed` or `cancelled`, the tracker writes the job to the D1 `downloads` table, drops it from its own storage, and sends an SSE event named after the status to `GET /api/v1/downloads/events`. Nothing is sent while a job is queued. If Render can't be reached `DOWNLOAD_MAX_POLL_FAILURES` times in a row, the job is stored as `failed`.
5. With no queued jobs left, the tracker stops setting alarms, so it holds nothing between downloads.

A job looks like this, with fewer fields while queued (`id`, `source_url`, `status`, `created_at`, `next_code`):

```json
{
  "id": "3f6c2a1e-…",
  "source_url": "https://www.facebook.com/watch?v=…",
  "status": "completed",
  "title": "Some video",
  "filename": "1234567890.mp4",
  "content_type": "video/mp4",
  "filesize": 48213374,
  "error": null,
  "created_at": "2026-10-24T14:00:00Z",
  "updated_at": "2026-10-24T14:01:12Z",
  "next_code": "…"
}
```

`filename` is the B2 object key.

### Render service contract

Every request carries `Authorization: Bearer <DOWNLOADER_API_KEY>`.

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/jobs` | `{ "url": string }` | `202` queued job |
| GET | `/jobs/:id?code=<next_code>` | none | the job: queued with a new `next_code`, or final with every field |

## API

All routes are under `/api/v1`, and every `/downloads` route needs the auth cookie. Errors come back as `{ "error": "...", "issues"?: { field: [messages] } }`.

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/send-otp` | `{ "password": string }` | `{ "sent": true }` |
| POST | `/auth/login` | `{ "code": "123456" }` | `{ "token": string }` + auth cookie |
| POST | `/auth/logout` | none | `{ "loggedOut": true }` |
| POST | `/downloads` | `{ "url": string }` | `202` queued job |
| GET | `/downloads` | none | queued jobs, then finished ones, newest first |
| GET | `/downloads/events` | none | SSE stream: `completed`, `failed` or `cancelled` events with the job as data |
| GET | `/downloads/:id/file` | none | `{ "url": string }`, a presigned B2 link (completed jobs only) |
| DELETE | `/downloads/:id` | none | `{ "deleted": true }`, removes the file from B2 and the row from D1 |

### Request and response schemas

Request bodies are checked by the zod builders in `schemas/` (`schemas/auth.ts`, `schemas/downloads.ts`). Job responses are checked against `fetchrDownloadSchema` in `backend/src/modules/downloads/utils.ts`.

```ts
// Shared types
type QueuedJob = {
  id: string                // Render job id, also the download id
  source_url: string
  status: 'queued'
  created_at: string        // ISO 8601
  next_code: string         // token for the next poll
}

type FinishedJob = {
  id: string
  source_url: string
  status: 'completed' | 'failed' | 'cancelled'
  title: string | null
  filename: string | null   // B2 object key, set when completed
  content_type: string | null
  filesize: number | null   // bytes
  error: string | null      // set when failed
  created_at: string
  updated_at: string
  next_code: string | null  // null once finished
}

type Job = QueuedJob | FinishedJob   // tell them apart by status

type ErrorResponse = {
  error: string
  issues?: Record<string, string[]>  // only on 400 validation errors, keyed by field
}
```

#### `POST /auth/send-otp`
```ts
// Request
{ password: string }  // at least PASSWORD_MIN_LENGTH (8) chars, with upper, lower, digit and symbol
// 200
{ sent: true }
// 400, 401, 429, 500, 502 → ErrorResponse
```

#### `POST /auth/login`
```ts
// Request
{ code: string }      // exactly OTP_LENGTH (6) digits; surrounding spaces are trimmed
// 200, also sets the httpOnly bhandar_token cookie
{ token: string }
// 400, 401, 429, 500 → ErrorResponse
```

#### `POST /auth/logout`
```ts
// No body. 200, clears the cookie
{ loggedOut: true }
```

#### `POST /downloads`
```ts
// Request
{ url: string }       // http(s) URL whose host is in DOWNLOAD_ALLOWED_HOSTS
// 202
QueuedJob
// 400 (invalid link), 401, 502 (Render unreachable or bad answer) → ErrorResponse
```
Example:
```json
// → { "url": "https://www.facebook.com/watch?v=1029384756" }
// ← 202
{
  "id": "3f6c2a1e-8b4d-4c7a-9e2f-1d5b7c9a0e31",
  "source_url": "https://www.facebook.com/watch?v=1029384756",
  "status": "queued",
  "created_at": "2026-10-24T14:00:00Z",
  "next_code": "a1b2c3d4"
}
```

#### `GET /downloads`
```ts
// 200: queued jobs first (newest first), then finished ones (newest first)
Job[]
// 401, 500 → ErrorResponse
```

#### `GET /downloads/events`
A `text/event-stream`. It opens with a `: connected` comment and sends `: ping` every `SSE_HEARTBEAT_SECONDS`. It has one event per job, sent when the job reaches a final state:
```
event: completed            // or failed / cancelled
data: <FinishedJob as JSON>
```
Example:
```
event: completed
data: {"id":"3f6c2a1e-…","source_url":"https://www.facebook.com/watch?v=…","status":"completed","title":"Some video","filename":"3f6c2a1e-….mp4","content_type":"video/mp4","filesize":48213374,"error":null,"created_at":"2026-10-24T14:00:00Z","updated_at":"2026-10-24T14:01:12Z","next_code":null}
```

#### `GET /downloads/:id/file`
```ts
// 200: presigned link, valid for STORAGE_URL_TTL_SECONDS; the browser saves it under the title
{ url: string }
// 401, 404 (unknown id or file missing in B2), 409 (failed or cancelled), 502 (B2 error) → ErrorResponse
```

#### `DELETE /downloads/:id`
```ts
// 200: file removed from B2 (if any) and row from D1
{ deleted: true }
// 401, 404, 500, 502 → ErrorResponse
```

#### Render service
```ts
// POST /jobs
// Request
{ url: string }
// 202
QueuedJob

// GET /jobs/:id?code=<next_code>
// 200, while still running (with a new next_code for the next poll)
QueuedJob
// 200, once done
FinishedJob
```
Any non-2xx status, timeout or response that doesn't match these shapes counts as a failed poll.

`GET /health` (outside `/api`, not rate limited) returns `{ "status": "ok", "db": "ok" }`, or `503` with `"db": "unreachable"` when D1 can't be queried.

| Status | Meaning |
|---|---|
| 400 | Body is not JSON or fails validation |
| 429 | Too many requests from this IP |
| 401 | Wrong password, wrong or expired code, or not logged in |
| 404 | Download not found, or its file is missing from B2 |
| 409 | The download has no file (it failed or was cancelled) |
| 502 | The login email could not be sent, or Render or B2 failed |
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
