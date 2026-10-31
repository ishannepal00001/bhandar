# Bhandar

A personal Facebook video downloader for a single user. You paste a link, Bhandar downloads the video with `yt-dlp`, stores it in Backblaze B2 and keeps a history of everything you've saved. Only the owner can sign in: login takes a password and then a one-time code sent by email.

This README covers the whole project: how the backend and frontend are built, how they work, and how to run them. The endpoint-by-endpoint reference (every error message, the SSE format and the fetchr contract) is in [backend/API.md](backend/API.md).

## Contents

- [Status](#status)
- [Architecture](#architecture)
- [Stack](#stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Backend](#backend)
  - [Request pipeline](#request-pipeline)
  - [Module layers and errors](#module-layers-and-errors)
  - [Database](#database)
  - [How login works](#how-login-works)
  - [How downloads work](#how-downloads-work)
  - [fetchr, the download service](#fetchr-the-download-service)
  - [Storage](#storage)
  - [API summary](#api-summary)
- [Frontend](#frontend)
  - [Routing](#routing)
  - [Layout and navigation](#layout-and-navigation)
  - [Pages](#pages)
  - [Components](#components)
  - [Clip editor](#clip-editor)
  - [State](#state)
  - [Data and types](#data-and-types)
  - [Styling and theme](#styling-and-theme)
- [Shared schemas](#shared-schemas)
- [Scripts](#scripts)
- [Conventions](#conventions)

## Status

| Part | State |
|---|---|
| Backend: auth | Done. Password + emailed OTP login, JWT cookie, logout, per-IP rate limits |
| Backend: downloads | Done on the Worker side. Queues jobs on fetchr, polls them from a Durable Object, stores finished ones in D1, pushes them over SSE, serves B2 links, deletes |
| Backend: dashboard | Done. `GET /api/v1/dashboard` returns the stats, the queued jobs and the latest finished ones |
| fetchr (Python `yt-dlp` service on Render) | **Not built yet.** Its contract is defined in [backend/API.md](backend/API.md#upstream-fetchr). Until it exists, no video actually downloads |
| Frontend: UI | Done. Login page, dashboard, downloads page, queue, download modal, collapsible sidebar, light and dark themes |
| Frontend: editing | UI only. The Editing page opens an uploaded file in a full-screen video.js player with a clip toolbar. Clips aren't cut or saved, and "Use downloads" does nothing yet |
| Frontend: API calls | Wired up. Login, the dashboard, the downloads list, the download form, and save and delete all call the backend; the lists refresh live over SSE. The queue's cancel button and Create clip still do nothing (there is no cancel endpoint) |

## Architecture

```
 Browser (React SPA)
   │  cross-site in production (CORS + CSRF allow only FRONTEND_ORIGIN);
   │  same origin in dev, where /api is proxied to :8787
   │  cookie: bhandar_token (httpOnly, Secure, SameSite=None)
   ▼
 Cloudflare Worker (Hono)
   ├── /api/v1/auth/*       ──► D1 (users, otp) ──► SMTP (login codes)
   ├── /api/v1/downloads/*  ──► DownloadTracker Durable Object
   │                              │  keeps queued jobs, polls on an alarm,
   │                              │  streams finished jobs over SSE
   │                              ├──► fetchr on Render (yt-dlp + ffmpeg) ──► uploads to B2
   │                              └──► D1 (downloads) when a job finishes
   ├── /api/v1/downloads/:id/file ──► presigned B2 link
   ├── /api/v1/dashboard    ──► stats, queued jobs (Durable Object) and recent ones (D1)
   └── /health              ──► D1 round trip
```

The Worker never touches video bytes. fetchr downloads the video and uploads it to Backblaze B2 itself. The Worker only tracks job status and hands the browser short-lived signed links to the files.

## Stack

| Part | Tech |
|---|---|
| Backend | [Hono](https://hono.dev) on [Cloudflare Workers](https://developers.cloudflare.com/workers/), D1 (its own `prepare().bind()` API, no query builder), a SQLite-backed Durable Object, Zod, Nodemailer (via `nodejs_compat`), aws4fetch for B2 |
| Frontend | React 19, Vite, TanStack Router, Zustand, Tailwind CSS v3, lucide-react, [Video.js 10](https://videojs.org) (`@videojs/react`, pinned to 10.2.0), oxlint |
| Shared | Zod request-schema builders in `schemas/`, used by the backend and meant for the frontend |
| External | fetchr, a Python service on Render running `yt-dlp` + `ffmpeg`; Backblaze B2 for storage; an SMTP server for login codes |
| Tooling | Bun 1.3+ as the package manager and test runner, Wrangler for running and deploying the Worker |

## Repository layout

```
bhandar/
├── schemas/                     Zod request schemas shared by backend and frontend
│   ├── auth.ts                  send-otp and login bodies, password rule
│   └── downloads.ts             download body, allowed hosts
├── backend/
│   ├── wrangler.jsonc.example   Worker config template: every var and secret (blank), D1, Durable Object, rate limits
│   ├── wrangler.jsonc           your filled-in copy (gitignored, holds the secrets)
│   ├── API.md                   full API reference
│   ├── migrations/
│   │   ├── 0001_init.sql        users and otp tables
│   │   ├── 0002_seed_user.sql.example   login user seed (copy to .sql, gitignored)
│   │   └── 0003_downloads.sql   finished downloads table
│   └── src/
│       ├── index.ts             Hono app: logger, API rate limit, routers, /health, error mapping, exports DownloadTracker
│       ├── api/v1/
│       │   ├── auth.ts          /auth routes
│       │   └── download.ts      /downloads routes (behind isUser)
│       ├── modules/
│       │   ├── auth/            controller, service, model, utils (+ .types.ts / .error.ts siblings)
│       │   └── downloads/       controller, service, model, utils, tracker (DownloadTracker Durable Object)
│       └── core/
│           ├── types.ts         re-exports every *.types.ts in core/
│           ├── middlewares/
│           │   ├── fetchr.ts    Fetchr client: signs requests and keeps the rolling code
│           │   ├── isUser.ts    guards routes with the auth cookie
│           │   └── rateLimit.ts per-IP limits from the ratelimits bindings
│           └── utils/
│               └── storage.ts   Storage class for Backblaze B2 (upload, list, get, delete)
└── frontend/
    ├── vite.config.ts           React plugin, /api proxy to :8787
    ├── tailwind.config.js       palette, dark mode, animations
    └── src/
        ├── main.tsx, App.tsx    React root and router
        ├── Layout.tsx           sidebar + mobile header + download modal around the app pages
        ├── routes/              one TanStack route per file
        ├── pages/               Auth, Dashboard, Downloads, Editing
        ├── editor/              clip editor: video.js player + clip toolbar, exported from index.ts
        ├── components/          Sidebar, Modal, Marquee, VideoCard, HeaderActions, Auth/*, Downloads/*
        ├── stores/              Zustand stores: UI (sidebar, download modal) and client-side download and dashboard state
        ├── facades/             junctions (authFacade, dashboardFacade, downloadsFacade) exposing the hooks and store functions
        ├── hooks/               TanStack Query hooks, one per endpoint, on request.ts; plus useMediaQuery
        ├── queryClient.ts       the QueryClient and its localStorage persister
        ├── types/               request and response types matching the backend
        ├── utils/               formatting and job helpers
        └── config.ts, styles.ts shared constants and class strings
```

## Getting started

### Requirements

- Bun 1.3+
- A Cloudflare account (for deploying; local dev runs on Wrangler's simulator)
- An SMTP account for sending login codes
- For real downloads: a running fetchr service and a private Backblaze B2 bucket with an application key

### Backend

```sh
cd backend
bun install
cp wrangler.jsonc.example wrangler.jsonc                               # fill in the SMTP vars and the secrets
cp migrations/0002_seed_user.sql.example migrations/0002_seed_user.sql  # fill in email and password hash
bun run db:migrate:local    # creates the tables and the login user in the local D1 database
bun run dev                 # http://127.0.0.1:8787
```

Check it's up with `curl http://127.0.0.1:8787/health`.

### Frontend

```sh
cd frontend
bun install
bun run dev                 # Vite dev server; /api is proxied to the backend on :8787
```

### Deploying the backend

```sh
cd backend
bunx wrangler d1 create bhandardb        # once; put the printed id in wrangler.jsonc database_id
bun run db:migrate:remote
bun run deploy
```

## Configuration

All configuration, secrets included, is in `backend/wrangler.jsonc`. That file is gitignored; `backend/wrangler.jsonc.example` is the committed template with the personal values and secrets blank. There is no `config.ts`, no `.env`, no `.dev.vars` and no `process.env`. Code reads config from the Worker bindings, either `import { env } from 'cloudflare:workers'` or `c.env` (for example `new Storage(c.env)`). Vars hold real JSON types (numbers, booleans). `wrangler dev` regenerates `worker-configuration.d.ts` whenever `wrangler.jsonc` changes (`dev.generate_types`). It's gitignored too, because it's generated from the file that holds the secrets; run `bun run cf-typegen` on a fresh clone.

| Where | Keys | Purpose |
|---|---|---|
| `vars` | `OTP_LENGTH`, `OTP_TTL_MINUTES`, `OTP_MAIL_SUBJECT` | Login codes: number of digits, lifetime and email subject |
| `vars` | `PASSWORD_MIN_LENGTH`, `PASSWORD_SALT_BYTES` | Password rule and salt size |
| `vars` | `JWT_ALGORITHM`, `JWT_TTL_DAYS` | Login token signing and lifetime |
| `vars` | `COOKIE_NAME`, `COOKIE_SECURE`, `COOKIE_SAME_SITE` | The auth cookie |
| `vars` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `MAIL_FROM` | SMTP server for login codes (port `465` uses TLS) |
| `vars` | `B2_BUCKET`, `B2_ENDPOINT`, `B2_REGION`, `STORAGE_URL_TTL_SECONDS` | Backblaze B2 bucket, its S3 endpoint, and how long download links last |
| `vars` | `DOWNLOADER_URL`, `DOWNLOADER_CLIENT_ID`, `DOWNLOADER_TIMEOUT_SECONDS` | fetchr's origin (e.g. `https://bhandar-downloader.onrender.com`), the client id fetchr knows us by, and the per-request timeout |
| `vars` | `DOWNLOAD_POLL_SECONDS`, `DOWNLOAD_MAX_POLL_FAILURES`, `DOWNLOAD_TRACKER_NAME`, `SSE_HEARTBEAT_SECONDS` | How often the tracker polls fetchr, how many failed polls in a row mark a job failed, the tracker instance's name, and the SSE keep-alive interval |
| `vars` | `DOWNLOAD_MAX_QUEUED` | Most downloads queued at once (`POST /downloads` returns `429` past it) and most jobs polled per alarm. Keep it under 50, the subrequests one Workers Free invocation may make |
| `vars` | `DOWNLOAD_FILE_EXTENSION` | Added to a finished video's title when it's saved (`.mp4`) |
| `vars` | `DOWNLOAD_ALLOWED_HOSTS` | Hosts a download link may use (Facebook and `fb.watch`) |
| `vars` (secrets) | `JWT_SECRET`, `SMTP_PASS`, `B2_KEY_ID`, `B2_APP_KEY`, `DOWNLOADER_SEED_CODE` | The JWT signing key, the SMTP password, the B2 application key, and fetchr's first rolling code. They're plain vars, so when deployed they show in the Cloudflare dashboard like any other var |
| `d1_databases` | `BHANDAR_DB` → `bhandardb` | The database |
| `durable_objects` | `DOWNLOAD_TRACKER` → `DownloadTracker` | The download poller (SQLite-backed, so it runs on the free plan) |
| `ratelimits` | `SEND_OTP_LIMITER` 3/min, `LOGIN_LIMITER` 5/min, `API_LIMITER` 60/10s | Per-IP limits. Cloudflare counts them per location, so they're approximate |

The login user comes from `migrations/0002_seed_user.sql`. It's gitignored because it holds your email and password hash. The committed `.sql.example` shows how to generate the hash with `openssl` and `sha256sum`.

The frontend has no config of its own beyond `src/config.ts` (the OTP length the code form renders) and the dev proxy in `vite.config.ts`.

## Backend

### Request pipeline

`src/index.ts` builds one Hono app:

1. Every `/api/*` request is logged (`hono/logger`) and counted against `API_LIMITER` by the `rateLimit` middleware, keyed on the `cf-connecting-ip` header.
2. `/api/v1/auth` is mounted from `api/v1/auth.ts`. `send-otp` and `login` add their own stricter limiters.
3. `/api/v1/downloads` is mounted from `api/v1/download.ts`. Every route there runs `isUser` first, which reads the `bhandar_token` cookie, verifies the JWT and puts `{ id, name }` on `c.var.user`.
4. `GET /health` sits outside `/api`, so it isn't logged or rate limited. It runs `SELECT 1` on D1.
5. Unknown routes return `404 { "error": "Not found" }`.
6. `app.onError` turns route, rate-limit and `isUser` errors into `{ error, issues? }` with their status. Anything else is logged and returns `500 { "error": "Something went wrong" }`.

The entry file also exports `DownloadTracker`, because Workers needs Durable Object classes exported from the entry module.

### Module layers and errors

Each module (`auth`, `downloads`) is split into layers, and each layer only calls the one below it:

| Layer | File | Job |
|---|---|---|
| Route | `api/v1/<name>.ts` | Parse the request, call the controller, return JSON and status |
| Controller | `modules/<name>/controller.ts` | Validate the body against the `schemas/` builders, with lengths and hosts from `env` |
| Service | `modules/<name>/service.ts` | Business logic |
| Model | `modules/<name>/model.ts` | SQL on the `BHANDAR_DB` D1 binding (`prepare().bind()`) |
| Utils | `modules/<name>/utils.ts` | Helpers: hashing, OTPs, JWTs, mail, fetchr job calls |

Each layer has its own error class, and each layer converts the error from the layer below into its own. For auth the chain is `AuthModelError` → `AuthServiceError` → `AuthControllerError` → `AuthRouteError`, and downloads has the same chain. Because of this, the HTTP status code is decided in one place, the route layer.

### Database

D1 (SQLite) holds three tables, created by the migrations:

| Table | Migration | Holds |
|---|---|---|
| `users` | `0001_init.sql` | `name`, `email`, `password` (SHA-256 of `<salt>:<password>`), `password_salt` |
| `otp` | `0001_init.sql` | `user_id`, `code_hash` (SHA-256 of the code), `expires_at`. Indexed on `code_hash` |
| `downloads` | `0003_downloads.sql` | Finished jobs only: `id` (fetchr's job id), `user_id`, `source_url`, `status` (`completed`/`failed`/`cancelled`), `title`, `filename` (the B2 key), `content_type`, `filesize`, `error`, `created_at`, `updated_at`. Indexed on `(user_id, created_at DESC)` |

Queued jobs aren't in D1. They live in the DownloadTracker's own SQLite storage (a `jobs` table with `id`, `user_id`, `source_url`, `created_at`, `failures`) until they finish.

### How login works

1. **`POST /api/v1/auth/send-otp`** with `{ password }`. The controller checks it against the password rule: at least `PASSWORD_MIN_LENGTH` (8) characters, with an uppercase letter, a lowercase letter, a number and a symbol. The service hashes it with each user's salt and compares. On a match, it generates an `OTP_LENGTH` (6) digit code, stores its SHA-256 hash with an expiry of `OTP_TTL_MINUTES` (10), and emails the code through Nodemailer.
2. **`POST /api/v1/auth/login`** with `{ code }`. The service looks up the hashed code, checks it hasn't expired, and signs an `HS256` JWT with `{ sub, name }` valid for `JWT_TTL_DAYS` (7). The code is deleted only after the token is signed, so a failed login doesn't use it up. The response sets the `bhandar_token` cookie (`HttpOnly`, `Secure`, `SameSite=None`, since the frontend is on another site) and also returns the token in the body for clients without cookies.
3. **Protected routes** run `isUser`, which returns `401 Not logged in` with no cookie and `401 Invalid or expired session` for a bad or expired token.
4. **`POST /api/v1/auth/logout`** clears the cookie. The JWT isn't revoked; it's only removed from the browser.

### How downloads work

1. **`POST /api/v1/downloads`** with `{ url }`. The controller checks the URL is http(s) and its host is in `DOWNLOAD_ALLOWED_HOSTS`. The service hands it to the DownloadTracker, which asks fetchr to queue it and returns `202` with the queued job right away, so the app stays usable while the download runs.
2. **The DownloadTracker** is a Durable Object: a small stateful Worker that keeps its own storage and can set alarms. There's one instance for the whole app, addressed by `DOWNLOAD_TRACKER_NAME`. Cloudflare starts it the first time it's used and unloads it when it's idle.
3. **Queue cap.** At most `DOWNLOAD_MAX_QUEUED` (10) jobs can be queued at once. Jobs whose fetchr call hasn't returned yet count too, so two requests sent together can't both take the last slot. Past the cap, `POST` returns `429`.
4. **Polling.** While any job is queued, the tracker's alarm fires every `DOWNLOAD_POLL_SECONDS` (8) and asks fetchr for the status of up to `DOWNLOAD_MAX_QUEUED` jobs, oldest first. fetchr's `queued`, `downloading`, `uploading` and `verifying` all show to the user as `queued`.
5. **Finishing.** When fetchr reports `completed`, `failed` or `cancelled`, the tracker writes the job to the D1 `downloads` table first, and only then drops it from its own storage. If the D1 write fails, the job stays tracked and the next alarm tries again. If fetchr can't be reached `DOWNLOAD_MAX_POLL_FAILURES` (15) polls in a row, the job is stored as `failed` with the last error.
6. **Live updates.** `GET /api/v1/downloads/events` is a Server-Sent Events stream served by the tracker. It sends one event per job when the job finishes, named after its status, with the finished job as JSON data. It sends a `: ping` comment every `SSE_HEARTBEAT_SECONDS` (25) to keep proxies from closing it. Events aren't replayed, so a client should call `GET /downloads` again after reconnecting.
7. **Listing.** `GET /api/v1/downloads` returns the user's queued jobs from the tracker, newest first, followed by finished jobs from D1, newest first.
8. **Getting the file.** `GET /api/v1/downloads/:id/file` returns a presigned B2 link valid for `STORAGE_URL_TTL_SECONDS` (3600). It carries `Content-Disposition: attachment`, so the browser saves it as the job's title plus `DOWNLOAD_FILE_EXTENSION` (`.mp4`).
9. **Deleting.** `DELETE /api/v1/downloads/:id` removes the B2 object first and then the D1 row, so a delete that fails partway can just be retried. Queued jobs can't be deleted.
10. With no queued jobs left, the tracker stops setting alarms, so it holds nothing between downloads.

### fetchr, the download service

fetchr is the Python service on Render that runs `yt-dlp` and `ffmpeg`, downloads the video and uploads it to B2 under `downloads/<client_id>/<id>/<filename>`. The Worker talks to it only from the DownloadTracker, through the `Fetchr` client in `core/middlewares/fetchr.ts`.

Requests are authenticated with a rolling code:

- Every request sends `X-Client-Id: <DOWNLOADER_CLIENT_ID>` and `X-Fetchr-Code: <current code>`.
- Every authenticated reply, errors included, carries `X-Fetchr-Next-Code`. The tracker stores it in its own storage, so it survives restarts, and sends it on the next request.
- `DOWNLOADER_SEED_CODE` is used only before the first rotation.

The Worker uses two endpoints: `POST /api/v1/downloads` to queue a link and `GET /api/v1/downloads/{id}` to poll one. The full contract, including the response shape, is in [backend/API.md](backend/API.md#upstream-fetchr).

### Storage

`core/utils/storage.ts` exports a `Storage` class that talks to Backblaze B2's S3-compatible API with aws4fetch, using `B2_KEY_ID` and `B2_APP_KEY`. It can `upload`, `getFiles` (list), `getFile` (a presigned link with an optional download name) and `deleteFile`. The downloads module uses `getFile` and `deleteFile`; uploads are done by fetchr.

### API summary

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
| DELETE | `/downloads/:id` | none | `{ "deleted": true }` |

`GET /health` (outside `/api`) returns `{ "status": "ok", "db": "ok" }`, or `503` with `"db": "unreachable"`.

The job shapes the API returns:

```ts
type QueuedJob = { id: string; source_url: string; status: 'queued'; created_at: string }

type FinishedJob = {
  id: string
  source_url: string
  status: 'completed' | 'failed' | 'cancelled'
  title: string | null
  filename: string | null      // B2 key, set only when completed
  content_type: string | null
  filesize: number | null      // bytes
  error: string | null
  created_at: string
  updated_at: string
}

type Job = QueuedJob | FinishedJob
```

## Frontend

A React 19 single-page app built with Vite. In development, Vite proxies `/api` to the Worker on `127.0.0.1:8787`, so the browser sees one origin. In production the frontend is on another site, so it must send `credentials: 'include'` on `fetch` and `{ withCredentials: true }` on `EventSource`, and the Worker's `FRONTEND_ORIGIN` must be its URL.

### Routing

Routes are built with TanStack Router in code, one route per file in `src/routes/`, and assembled in `App.tsx`:

```
rootRoute                       Outlet; any unknown path redirects to /
├── layoutRoute (id: "app")     pathless; wraps pages in Layout
│   ├── /            Dashboard
│   ├── /downloads   Downloads
│   └── /editing     Editing
└── /auth            Auth (outside the layout, full screen)
```

The router type is registered with TanStack's `Register` interface, so `<Link to>` paths are type-checked.

### Layout and navigation

`Layout.tsx` wraps the app pages:

- **Sidebar** (`components/Sidebar.tsx`). On desktop (≥ 768px) it's sticky and can collapse to a narrow icon rail; the collapsed setting is remembered in `localStorage`. On mobile it's an off-canvas drawer opened from the header's menu button, closed by the backdrop, the close button or Escape, and it locks page scroll while open. It links to Dashboard, Downloads and Editing, shows placeholders for the upcoming History and Settings sections, and has a Download button that opens the download modal.
- **Mobile header.** A sticky bar with the app name and the menu button, shown below 768px.
- **Download modal** (`components/Modal.tsx`). Holds the `DownloadForm`. It closes on Escape or a click on the backdrop, and locks page scroll while open.

### Pages

| Page | Route | What it shows |
|---|---|---|
| Auth | `/auth` | A two-step login: `PasswordForm`, then `CodeForm`. A `Stepper` shows progress and each step slides in from the side it came from (turned off for reduced motion) |
| Dashboard | `/` | Header actions; four stats computed from the jobs (saved videos, storage used, number queued, failed or cancelled); the queue; a scrolling marquee of the six most recent finished downloads, with a link to the downloads page |
| Downloads | `/downloads` | Header actions; the download form; the queue; every finished download in a grid, filterable by All / Done / Failed / Cancelled |
| Editing | `/editing` | A centred title, short description, and two buttons: **Use downloads** (not wired yet) and **Upload videos**, which opens a file picker and shows the chosen file in the [clip editor](#clip-editor) |

### Components

| Component | Does |
|---|---|
| `Auth/PasswordForm` | Password field with a show/hide toggle |
| `Auth/CodeForm` | One box per OTP digit. Typing advances, Backspace goes back, arrow keys move, and pasting fills every box. The first box uses `autocomplete="one-time-code"`. Submit is enabled once every digit is filled |
| `Auth/Stepper` | Step indicator for the login flow |
| `Downloads/DownloadForm` | Facebook URL input and Download button |
| `Downloads/DownloadQueue` | Queued jobs with their link and queue time, a cancel button each, and an empty state |
| `VideoCard` | One finished job: placeholder thumbnail, title (or the link without the scheme), error if any, status badge, size and date, plus save and delete buttons (save only when completed) |
| `Marquee` | Endless horizontal scroll of `VideoCard`s that pauses on hover and stops for reduced motion |
| `HeaderActions` | "Create download" (opens the modal) and "Create clip" buttons |
| `Modal` | Accessible dialog with a title, close button, Escape and backdrop handling |

### Clip editor

Everything for editing lives in `src/editor/`, and pages import it from `src/editor/index.ts` (`import { Editor } from '../editor'`).

| File | Does |
|---|---|
| `Editor.tsx` | Covers the whole viewport over the app on a black background and renders the Video.js player (`VideoPlayer`, `VideoSkin`, `Video` from `@videojs/react/video`). The video is scaled to fit. The player's own fullscreen button still works |
| `ClipToolbar.tsx` | Floats over the top left of the video, with a close button at the top right. It's a child of the skin, so it sits inside the player's container: it stays on screen in native fullscreen and fades in and out with the player's controls (`controlsVisible`) |
| `format.ts` | Formats times as `m:ss.s` or `h:mm:ss.s` |
| `index.ts` | Exports `Editor` |

The toolbar has one button that walks through a clip:

| Button shows | Pressing it | Then shows |
|---|---|---|
| **Create clip** (first time only) | starts clipping | Start clip |
| **Start clip** | marks the start at the current playback time | End clip |
| **End clip** | marks the end and completes the clip | Start clip, for the next one |

Next to the button, a readout shows `From <start>` while you choose the end, then the last clip's range. Pressing End at or before the start shows a warning and stays on End clip. Clips aren't saved or cut anywhere yet.

The chosen file plays from an object URL in the browser, nothing is uploaded, and the URL is freed when the editor closes.

**Theming the player.** The packaged skin's public settings set the accent to the app's gold, square corners, no border and the app font. Its internal variables, which aren't a documented API, give the control bar, menus and popups the app background and text colours, square corners, and no blur, gradient or shadow. Because of those internal variables, `@videojs/react` is pinned to exactly `10.2.0`; check the player after any upgrade. Two pieces may still render rounded: the seek slider's track outline and its drag handle.

**Loading the skin CSS.** The skin stylesheet uses native CSS `@layer` rules, which Tailwind v3 rejects at build time. `Editor.tsx` imports it with `?raw`, which skips the CSS pipeline, and renders it in a React 19 `<style href precedence>` tag so it's added to the page head once.

### State

Global UI state is in two small Zustand stores:

| Store | State |
|---|---|
| `useSidebarStore` | `collapsed` (persisted to `localStorage` under `sidebar`) and `mobileOpen` |
| `useDownloadModalStore` | `open` |

Form state is local `useState`. `hooks/useMediaQuery` wraps `matchMedia` in `useSyncExternalStore`, and the sidebar uses it to tell desktop from mobile.

### Data and types

`types/downloads.ts` mirrors the backend's `QueuedJob`, `FinishedJob` and `Job`. `utils/jobs.ts` has the `isQueued` / `isFinished` type guards, the status labels (Done, Failed, Cancelled) and `jobTitle`. `utils/format.ts` formats byte sizes and dates with `Intl.DateTimeFormat`.

The pages read real data through the facades; the queue's cancel button and Create clip don't do anything yet. `src/hooks/` has a TanStack Query hook per endpoint, all calling `request.ts` (which always sends the cookie), and `useDownloadEvents` refetches the job queries when the SSE stream reports a finished job. The query cache is saved to localStorage (`queryClient.ts`) and cleared on logout. `src/facades/` is the junction the pages call through: `dashboardFacade` and `downloadsFacade` expose the hooks (and any store functions) unchanged, e.g. `downloadsFacade.useDownloads()`. UI-only state such as the sidebar and the download modal stays in its store, outside the facades.

### Styling and theme

Tailwind CSS v3 with a three-colour palette and square corners everywhere:

| Token | Light | Dark (`night-*`) |
|---|---|---|
| `primary` (text, buttons) | `#0B2350` navy | `#F3EFE6` cream |
| `background` | `#F3EFE6` cream | `#0A1224` ink navy |
| `accent` | `#B08A3C` gold | `#D4AF5F` brighter gold |

Dark mode follows the system setting (`darkMode: "media"`). Headings use the serif font. Shared class strings (`muted`, `panel`) are in `src/styles.ts`. Custom animations (`marquee`, `step-next`, `step-prev`) are defined in `tailwind.config.js`.

## Shared schemas

`schemas/` holds the Zod request schemas. The limits they need live in the backend's `wrangler.jsonc`, so each one is a builder that takes them as arguments:

| Builder | File | Validates |
|---|---|---|
| `createSendOtpRequestSchema(minLength)` | `auth.ts` | `{ password }` against `passwordRegex(minLength)` |
| `createLoginRequestSchema(otpLength)` | `auth.ts` | `{ code }`, trimmed, exactly `otpLength` digits |
| `createDownloadRequestSchema(allowedHosts)` | `downloads.ts` | `{ url }`, http(s), host in `allowedHosts` |

The backend controllers call them with values from `env`. The frontend doesn't use them yet.

## Scripts

| Where | Command | Does |
|---|---|---|
| backend | `bun run dev` | Start the API locally with `wrangler dev` |
| backend | `bun run deploy` | Deploy the Worker |
| backend | `bun run cf-typegen` | Regenerate binding types without `wrangler dev` running (e.g. in CI) |
| backend | `bun run db:migrate:local` / `:remote` | Apply `migrations/` to D1, including the login user seed |
| backend | `bun run typecheck` | Type-check with `tsc` |
| frontend | `bun run dev` | Start the Vite dev server |
| frontend | `bun run build` | Type-check and build to `dist/` |
| frontend | `bun run lint` | Lint with oxlint |
| frontend | `bun run preview` | Serve the production build |

## Conventions

- **Config** only in `wrangler.jsonc` (gitignored, template in `wrangler.jsonc.example`), read through the Worker bindings. No hard-coded values, `.env`, `.dev.vars` or `process.env`.
- **Database** through D1's own API (`env.BHANDAR_DB.prepare().bind()`), no query builder. Schema and seed data are migrations; there's no `scripts/` folder.
- **Sibling files.** Each file's types go in `<name>.types.ts` and its error class in `<name>.error.ts`. `core/types.ts` re-exports the core types.
- **Comments** go at the top of each file, labelled by the symbol they describe, not inline.
- **Commits** go straight to `main`.
