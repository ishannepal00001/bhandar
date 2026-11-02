# Bhandar backend API

The HTTP API served by the Worker in `backend/src`. Every shape below comes from the code: request bodies are checked by the zod builders in `schemas/`, and response types live in the `*.types.ts` files named in each section.

- [Conventions](#conventions)
- [Types](#types)
- [Health](#health)
- [Auth](#auth): `send-otp`, `login`, `logout`
- [Downloads](#downloads): create, list, events (SSE), file link, delete
- [Status codes and error messages](#status-codes-and-error-messages)
- [Upstream: fetchr](#upstream-fetchr)

## Conventions

| | |
|---|---|
| Base path | `/api/v1` (only `/health` is outside it) |
| Format | JSON in and out (`Content-Type: application/json`), except the SSE stream |
| Auth | The `bhandar_token` cookie set by `POST /auth/login`. Every `/downloads` and `/dashboard` route needs it; the `/auth` routes don't |
| CORS | The frontend is on another site. Only `FRONTEND_ORIGIN` is allowed, with credentials, so the frontend must send `credentials: 'include'` on `fetch` and `{ withCredentials: true }` on `EventSource`. The cookie is `SameSite=None; Secure` (`COOKIE_SAME_SITE`, `COOKIE_SECURE`) so the browser sends it cross-site. In dev, Vite proxies `/api` to `:8787`, so calls are same-origin anyway |
| CSRF | `hono/csrf` rejects form-style requests (`application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain` or no `Content-Type`) with an unsafe method from any origin other than `FRONTEND_ORIGIN`: `403 Forbidden`, as plain text |
| Rate limits | Per client IP (`cf-connecting-ip`). Every `/api/*` request counts against `API_LIMITER` (60 per 10 s). `send-otp` also counts against `SEND_OTP_LIMITER` (3/min) and `login` against `LOGIN_LIMITER` (5/min). Cloudflare counts per location, so the limits are approximate |
| Timestamps | ISO 8601 strings in UTC, e.g. `2026-10-24T14:00:00.000Z` |
| Logging | Every `/api/*` request is logged with `hono/logger` |

Every error has the same body:

```ts
type ErrorResponse = {
  error: string                         // human-readable message, safe to show
  issues?: Record<string, string[]>     // only on 400 "Invalid request", keyed by body field
}
```

Unknown routes return `404 { "error": "Not found" }`. Any error the code doesn't expect is logged and returns `500 { "error": "Something went wrong" }`.

## Types

Defined in `backend/src/modules/downloads/utils.types.ts`.

```ts
type QueuedJob = {
  id: string                 // fetchr's download id, also the id in the URLs below
  source_url: string         // the link that was submitted
  status: 'queued'           // fetchr's queued, downloading, uploading and verifying all show as queued
  created_at: string
}

type FinishedJob = {
  id: string
  source_url: string
  status: 'completed' | 'failed' | 'cancelled'
  title: string | null         // video title, when fetchr found one
  filename: string | null      // B2 object key downloads/<client_id>/<id>/<file>; set only when completed
  content_type: string | null  // e.g. "video/mp4"
  filesize: number | null      // bytes
  thumbnail: string | null     // B2 key downloads/<client_id>/<id>/thumbnail.jpg; null if fetchr couldn't make one
  error: string | null         // reason, when failed
  created_at: string
  updated_at: string           // when it reached its final status
}

type Job = QueuedJob | FinishedJob   // tell them apart by status

type ShownJob = FinishedJob & {
  thumbnail_url: string | null // signed inline link to the thumbnail, valid STORAGE_URL_TTL_SECONDS (3600)
}
```

`GET /downloads` and `GET /dashboard` return finished jobs as `ShownJob`. Signing is local (no request to B2), so it doesn't check that the image exists; show a placeholder when it fails to load. SSE events carry a plain `FinishedJob`.

Queued jobs live in the `DownloadTracker` Durable Object. Finished jobs live in the D1 `downloads` table (`migrations/0003_downloads.sql`). A job moves from the first to the second once, when it finishes.

## Health

### `GET /health`

Checks that the Worker is up and can run a query on D1. It is outside `/api`, so it isn't rate limited or logged.

| Status | Body |
|---|---|
| 200 | `{ "status": "ok", "db": "ok" }` |
| 503 | `{ "status": "error", "db": "unreachable" }` |

## Auth

Login takes two steps: send the password to get a code by email, then send the code back to get the cookie. The login user is seeded by `migrations/0002_seed_user.sql`.

### `POST /api/v1/auth/send-otp`

Checks the password against every user. On a match, it emails that user an `OTP_LENGTH` (6) digit code, valid for `OTP_TTL_MINUTES` (10).

Rate limits: `SEND_OTP_LIMITER` (3/min) and `API_LIMITER`.

Request (`createSendOtpRequestSchema` in `schemas/auth.ts`):

```ts
{
  password: string   // ≥ PASSWORD_MIN_LENGTH (8) chars, with a lowercase letter, an uppercase letter, a digit and a symbol
}
```

Response `200` (`SendOtpResult` in `modules/auth/service.types.ts`):

```json
{ "sent": true }
```

Errors:

| Status | `error` | When |
|---|---|---|
| 400 | `Body must be valid JSON` | Body isn't JSON |
| 400 | `Invalid request` | Fails the schema. `issues.password` holds `Password is required` or `Password must be at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol` |
| 401 | `Invalid password` | No user has this password |
| 429 | `Too many requests, try again in a minute` | Rate limited |
| 500 | `Failed to list users` / `Failed to save OTP` | D1 error |
| 502 | `Mail is not configured` / `Failed to send OTP mail` | SMTP vars or secret missing, or the send failed. The code was already saved, so asking again just makes a new one |

Example:

```http
POST /api/v1/auth/send-otp
Content-Type: application/json

{ "password": "Correct-Horse-9" }
```

```http
HTTP/1.1 200 OK

{ "sent": true }
```

### `POST /api/v1/auth/login`

Exchanges the emailed code for a JWT. A code works once. It is only used up after the token is signed, so a login that fails doesn't burn it.

Rate limits: `LOGIN_LIMITER` (5/min) and `API_LIMITER`.

Request (`createLoginRequestSchema` in `schemas/auth.ts`):

```ts
{
  code: string   // exactly OTP_LENGTH (6) digits; surrounding whitespace is trimmed
}
```

Response `200` (`LoginResult` in `modules/auth/service.types.ts`):

```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

It also sets the cookie that the protected routes read:

```http
Set-Cookie: bhandar_token=<jwt>; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=None
```

The token is an `HS256` JWT with payload `{ sub: "<user id>", name: "<user name>", iat, exp }`, valid for `JWT_TTL_DAYS` (7). The browser only needs the cookie; the token in the body is there for clients that don't keep cookies.

Errors:

| Status | `error` | When |
|---|---|---|
| 400 | `Body must be valid JSON` | Body isn't JSON |
| 400 | `Invalid request` | `issues.code` holds `Code is required` or `Code must be 6 digits` |
| 401 | `Invalid code` | Wrong, expired, or already used code |
| 429 | `Too many requests, try again in a minute` | Rate limited |
| 500 | `JWT secret is not configured` / `Failed to sign token` | Token error |
| 500 | `Failed to look up OTP` / `Failed to look up user` / `Failed to delete OTP` | D1 error |

### `POST /api/v1/auth/logout`

Clears the auth cookie. It needs no body and no cookie, and it always succeeds. The JWT itself isn't revoked; it is only removed from the browser.

Response `200` (`LogoutResult` in `modules/auth/controller.types.ts`):

```json
{ "loggedOut": true }
```

## Downloads

Every route here runs the `isUser` middleware first, and only sees the logged-in user's downloads. Without a valid cookie they return:

| Status | `error` | When |
|---|---|---|
| 401 | `Not logged in` | No `bhandar_token` cookie |
| 401 | `Invalid or expired session` | Token is malformed, tampered with, or expired |
| 500 | `JWT secret is not configured` | `JWT_SECRET` is missing |

The flow: `POST /downloads` returns a queued job right away. The `DownloadTracker` polls fetchr every `DOWNLOAD_POLL_SECONDS` (8). When the job finishes, the tracker stores it in D1 and pushes it to `GET /downloads/events`. Then `GET /downloads/:id/file` gives a link to the video.

**Queue cap.** At most `DOWNLOAD_MAX_QUEUED` (10) downloads can be queued at once. Jobs whose fetchr call hasn't returned yet count too, so two requests sent together can't both take the last slot. Past the cap, `POST /downloads` returns `429` until a job finishes. Each alarm also polls at most `DOWNLOAD_MAX_QUEUED` jobs, oldest first, so one run stays under the 50 subrequests a Workers Free invocation may make. Keep the value below 50.

### `POST /api/v1/downloads`

Queues a Facebook video on fetchr.

Request (`createDownloadRequestSchema` in `schemas/downloads.ts`):

```ts
{
  url: string   // http or https, and the host must be in DOWNLOAD_ALLOWED_HOSTS:
                // facebook.com, www.facebook.com, m.facebook.com, web.facebook.com, fb.watch
}
```

Response `202 Accepted`: a `QueuedJob`.

```http
POST /api/v1/downloads
Cookie: bhandar_token=<jwt>
Content-Type: application/json

{ "url": "https://www.facebook.com/watch?v=1029384756" }
```

```http
HTTP/1.1 202 Accepted

{
  "id": "3f6c2a1e-8b4d-4c7a-9e2f-1d5b7c9a0e31",
  "source_url": "https://www.facebook.com/watch?v=1029384756",
  "status": "queued",
  "created_at": "2026-10-24T14:00:00.000Z"
}
```

Errors:

| Status | `error` | When |
|---|---|---|
| 400 | `Body must be valid JSON` | Body isn't JSON |
| 400 | `Invalid request` | `issues.url` holds `Enter a valid link` or `Only Facebook video links are supported` |
| 401 / 500 | see `isUser` above | |
| 429 | `10 downloads are already queued, wait for one to finish` | `DOWNLOAD_MAX_QUEUED` jobs are queued or starting (the number is the configured cap) |
| 502 | `Download service is not configured` | `DOWNLOADER_URL`, `DOWNLOADER_CLIENT_ID` or `DOWNLOADER_SEED_CODE` is empty |
| 502 | `Download service is unreachable` | Network error or no reply within `DOWNLOADER_TIMEOUT_SECONDS` (15) |
| 502 | `Download service answered <status>` | fetchr returned a non-2xx status |
| 502 | `Download service sent no next code` / `Download service sent an unexpected response` | fetchr's reply broke the [contract](#upstream-fetchr) |

### `GET /api/v1/downloads`

Lists the user's downloads.

Response `200`: `(QueuedJob | ShownJob)[]`. Queued jobs come first, newest first, followed by finished jobs, newest first.

```json
[
  {
    "id": "8a1d…",
    "source_url": "https://fb.watch/abc123/",
    "status": "queued",
    "created_at": "2026-10-24T14:05:00.000Z"
  },
  {
    "id": "3f6c2a1e-8b4d-4c7a-9e2f-1d5b7c9a0e31",
    "source_url": "https://www.facebook.com/watch?v=1029384756",
    "status": "completed",
    "title": "Some video",
    "filename": "downloads/my-client/3f6c2a1e-8b4d-4c7a-9e2f-1d5b7c9a0e31/Some video.mp4",
    "content_type": "video/mp4",
    "filesize": 48213374,
    "thumbnail": "downloads/my-client/3f6c2a1e-8b4d-4c7a-9e2f-1d5b7c9a0e31/thumbnail.jpg",
    "thumbnail_url": "https://s3.us-east-005.backblazeb2.com/bhandar.bucket/downloads/…/thumbnail.jpg?X-Amz-…",
    "error": null,
    "created_at": "2026-10-24T14:00:00.000Z",
    "updated_at": "2026-10-24T14:01:12.000Z"
  },
  {
    "id": "c0ffee…",
    "source_url": "https://www.facebook.com/reel/555",
    "status": "failed",
    "title": null,
    "filename": null,
    "content_type": null,
    "filesize": null,
    "thumbnail": null,
    "thumbnail_url": null,
    "error": "Download service is unreachable",
    "created_at": "2026-10-23T09:00:00.000Z",
    "updated_at": "2026-10-23T09:02:00.000Z"
  }
]
```

Errors: `401`/`500` from `isUser`, and `500 Failed to list downloads` (D1).

### `GET /api/v1/downloads/events`

A [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) stream of the user's jobs as they finish. Use it with `new EventSource(`${API}/api/v1/downloads/events`, { withCredentials: true })`; without `withCredentials` the browser doesn't send the cookie cross-site.

Response `200`, `Content-Type: text/event-stream`:

```
: connected

: ping

event: completed
data: {"id":"3f6c2a1e-…","source_url":"https://www.facebook.com/watch?v=1029384756","status":"completed","title":"Some video","filename":"downloads/my-client/3f6c2a1e-…/Some video.mp4","content_type":"video/mp4","filesize":48213374,"error":null,"created_at":"2026-10-24T14:00:00.000Z","updated_at":"2026-10-24T14:01:12.000Z"}

```

- It opens with a `: connected` comment, then sends `: ping` every `SSE_HEARTBEAT_SECONDS` (25) to keep proxies from closing the connection. Both are comments, so `EventSource` ignores them.
- Each job sends exactly one event, when it reaches a final status. The event name is that status (`completed`, `failed` or `cancelled`) and `data` is the `FinishedJob` as JSON. Nothing is sent while a job is queued.
- Listen per name: `es.addEventListener('completed', (e) => JSON.parse(e.data))`. `onmessage` won't fire, because every event has a name.
- Events have no `id:`, so nothing is replayed. An event that fires while the stream is down is lost. After a reconnect, call `GET /downloads` again to catch up.
- If fetchr can't be reached `DOWNLOAD_MAX_POLL_FAILURES` (15) polls in a row, the job finishes as `failed` with the last error in `error`.

Errors: only the `isUser` ones, as plain JSON before the stream opens.

## Dashboard

Runs `isUser` first, like the downloads routes, with the same `401`/`500` errors.

### `GET /api/v1/dashboard`

Everything the dashboard page shows, in one call. It doesn't update itself: refetch it when `GET /downloads/events` sends an event (a job moved from `queued` to `recent`), after `POST /downloads` (a job joined `queued`), and when the `EventSource` reconnects.

Response `200` (`Dashboard` in `modules/dashboard/service.types.ts`):

```json
{
  "stats": { "downloads": 2, "storage": 71341468, "failed": 2, "queued": 1 },
  "queued": [
    { "id": "8a1d…", "source_url": "https://fb.watch/abc123/", "status": "queued", "created_at": "2026-10-24T14:05:00.000Z" }
  ],
  "recent": [
    {
      "id": "3f6c2a1e-8b4d-4c7a-9e2f-1d5b7c9a0e31",
      "source_url": "https://www.facebook.com/watch?v=1029384756",
      "status": "completed",
      "title": "Some video",
      "filename": "downloads/my-client/3f6c2a1e-8b4d-4c7a-9e2f-1d5b7c9a0e31/Some video.mp4",
      "content_type": "video/mp4",
      "filesize": 48213374,
      "thumbnail": "downloads/my-client/3f6c2a1e-8b4d-4c7a-9e2f-1d5b7c9a0e31/thumbnail.jpg",
      "thumbnail_url": "https://s3.us-east-005.backblazeb2.com/bhandar.bucket/downloads/…/thumbnail.jpg?X-Amz-…",
      "error": null,
      "created_at": "2026-10-24T14:00:00.000Z",
      "updated_at": "2026-10-24T14:01:12.000Z"
    }
  ]
}
```

- `stats.downloads`: completed downloads. `stats.storage`: their total size in bytes. `stats.failed`: failed and cancelled downloads. `stats.queued`: the length of `queued`.
- `queued`: `QueuedJob[]`, newest first.
- `recent`: the latest `DASHBOARD_RECENT_LIMIT` (6) finished jobs (`ShownJob`) of any status, newest first.

Errors: `401`/`500` from `isUser`, and `500 Failed to count downloads` or `500 Failed to list recent downloads` (D1).

### `GET /api/v1/downloads/:id/file`

Returns a short-lived presigned Backblaze B2 link for a completed download. The link is valid for `STORAGE_URL_TTL_SECONDS` (3600). It carries `Content-Disposition: attachment`, so opening it saves the file as the job's `title` plus `DOWNLOAD_FILE_EXTENSION` (`.mp4`), e.g. `Some video.mp4`. Without a title, the key's file name is used.

Path params: `id`, the job id.

Response `200` (`FileLinkResult` in `modules/downloads/service.types.ts`):

```json
{ "url": "https://s3.us-east-005.backblazeb2.com/bhandar.bucket/downloads/my-client/3f6c…/Some%20video.mp4?X-Amz-Expires=3600&response-content-disposition=…&X-Amz-Signature=…" }
```

Errors:

| Status | `error` | When |
|---|---|---|
| 401 / 500 | see `isUser` above | |
| 404 | `Download not found` | No finished download with this id for this user. A job that is still queued gives 404 too |
| 404 | `File not found` | The row exists but the object is gone from B2 |
| 409 | `Download has no file` | The job `failed` or was `cancelled` |
| 500 | `Failed to look up download` | D1 error |
| 502 | `Storage is not configured` / `Storage is unreachable` / `Lookup failed with <status>` | B2 error |

### `DELETE /api/v1/downloads/:id`

Deletes a finished download. It removes the B2 video and thumbnail first, if there are any, and then the D1 row, so a delete that fails partway can just be retried.

Path params: `id`, the job id.

Response `200` (`DeleteResult` in `modules/downloads/service.types.ts`):

```json
{ "deleted": true }
```

Errors:

| Status | `error` | When |
|---|---|---|
| 401 / 500 | see `isUser` above | |
| 404 | `Download not found` | No finished download with this id for this user. Queued jobs can't be deleted |
| 500 | `Failed to look up download` / `Failed to delete download` | D1 error |
| 502 | `Storage is not configured` / `Storage is unreachable` / `Delete failed with <status>` | B2 error. An object that is already missing doesn't count as an error |

## Exports

Clip exports: clips cut from one of the user's completed downloads, joined in order into **one MP4** by fetchr, with the editor's caption burned in. Every route runs `isUser` first, with the same `401`/`500` errors as the downloads routes, and only sees the logged-in user's exports.

The flow mirrors downloads. `POST /exports` returns a queued export right away. The same `DownloadTracker` polls fetchr on the same alarm. It has to be the same object, because fetchr's rolling code is shared by every request the Worker makes. When the render finishes, the tracker stores it in D1 (`exports`, `migrations/0005_exports.sql`) and pushes it to `GET /exports/events`. Then `GET /exports/:id/file` gives a link to the video.

**Queue cap.** At most `EXPORT_MAX_QUEUED` (3) exports can be queued at once, counted like downloads. Past the cap, `POST /exports` returns `429`. Each alarm polls at most `DOWNLOAD_MAX_QUEUED` downloads plus `EXPORT_MAX_QUEUED` exports, so keep their sum under 50.

Types (`backend/src/modules/exports/utils.types.ts`):

```ts
type ExportClip = { start: number; end: number }        // seconds into the source download
type ExportCaption = { headline: string; details: string; hold: number; fade: number }

type QueuedExport = {
  id: string                    // fetchr's render id, also the id in the URLs below
  download_id: string           // the source download
  title: string | null          // the source download's title when the export was made
  clips: ExportClip[]           // in output order
  caption: ExportCaption | null
  status: 'queued'              // every running fetchr status shows as queued
  created_at: string
}

type FinishedExport = Omit<QueuedExport, 'status'> & {
  status: 'completed' | 'failed' | 'cancelled'
  filename: string | null       // B2 key renders/<client_id>/<id>/clip.mp4; set only when completed
  content_type: string | null   // "video/mp4"
  filesize: number | null       // bytes
  thumbnail: string | null      // B2 key of the first-frame thumbnail; null if fetchr couldn't make one
  error: string | null          // reason, when failed, e.g. "Clip ends after the video does"
  updated_at: string
}

type ShownExport = FinishedExport & { thumbnail_url: string | null }  // signed like ShownJob's
```

### `POST /api/v1/exports`

Queues a render of clips from one of the user's completed downloads.

Body (`createExportRequestSchema` in `schemas/exports.ts`):

```json
{
  "download_id": "3f6c2a1e-…",
  "clips": [ { "start": 12.4, "end": 31.0 }, { "start": 2, "end": 5.5 } ],
  "caption": { "headline": "Flood waters recede", "details": "Roads reopen Monday.", "hold": 6, "fade": 1.5 }
}
```

| Field | Rules |
|---|---|
| `download_id` | required; a download of this user's that completed |
| `clips` | 1 to `EXPORT_MAX_CLIPS` (20), in output order, may overlap. Each `start` ≥ 0 and `end` at least `EXPORT_MIN_CLIP_SECONDS` (0.5) after it. Together at most `EXPORT_MAX_SECONDS` (600) |
| `caption` | optional, `null` for none. `headline` 1–200 chars and `details` 1–600 chars, both trimmed; `hold` 0–600 and `fade` 0–60 seconds. The editor sends its own hold and fade so the render matches its preview |

The B2 key fetchr renders from is the download's stored `filename`, never anything from the request. A clip that ends past the video's end isn't caught here; the export finishes as `failed` with `Clip ends after the video does`.

Response `202`: a `QueuedExport`.

Errors:

| Status | `error` | When |
|---|---|---|
| 400 | `Body must be valid JSON` / `Invalid request` + `issues` | e.g. `{ "clips": ["The clips can add up to at most 600s"] }` |
| 404 | `Download not found` | No download with this id for this user |
| 409 | `Download has no file to clip` | The download failed or was cancelled |
| 429 | `3 exports are already queued, wait for one to finish` | Queue cap |
| 500 | `Failed to look up download` | D1 error |
| 502 | `Download service …` | fetchr unreachable, or it refused the render |

### `GET /api/v1/exports`

The user's queued exports (newest first) followed by the finished ones (newest first), as `QueuedExport | ShownExport`. Errors: `500 Failed to list exports` (D1).

### `GET /api/v1/exports/events`

The same SSE stream as `GET /downloads/events`, but for exports: `: connected`, `: ping` every `SSE_HEARTBEAT_SECONDS`, and one event per export when it finishes, named by its final status, with the `FinishedExport` as `data`. Downloads never appear on this stream, and exports never appear on the downloads one.

### `GET /api/v1/exports/:id/file`

A presigned B2 link to a completed export, valid `STORAGE_URL_TTL_SECONDS`. It saves as the source's title plus `EXPORT_FILE_SUFFIX` and `DOWNLOAD_FILE_EXTENSION`, e.g. `Some video (clip).mp4` (`clip (clip).mp4` without a title). Response `200`: `{ "url": string }`.

Errors: `404 Export not found` (also for a queued export), `404 File not found` (gone from B2), `409 Export has no file` (failed or cancelled), `500 Failed to look up export`, `502` for B2 errors.

### `DELETE /api/v1/exports/:id`

Deletes a finished export: the B2 video and thumbnail first, then the D1 row, so a failed delete can be retried. The source download is untouched. Response `200`: `{ "deleted": true }`.

Errors: `404 Export not found` (queued exports can't be deleted), `500 Failed to look up export` / `Failed to delete export`, `502` for B2 errors.

## Status codes and error messages

| Status | Meaning |
|---|---|
| 200 | OK |
| 202 | Download or export queued |
| 400 | Body isn't JSON (`Body must be valid JSON`) or fails validation (`Invalid request` + `issues`) |
| 401 | Wrong password or code, or not logged in or session expired |
| 403 | CSRF check failed: a form-style request from an origin other than `FRONTEND_ORIGIN` (plain-text `Forbidden`) |
| 404 | Route, download, export or B2 file not found |
| 409 | The download or export has no file (failed or cancelled) |
| 429 | Rate limited (`Too many requests, try again in a minute`), or the download or export queue is full |
| 500 | D1, JWT, or an error the code doesn't expect (`Something went wrong`) |
| 502 | SMTP, fetchr or B2 failed |
| 503 | `/health` only: D1 unreachable |

## Upstream: fetchr

The Worker never touches video bytes. fetchr, the Python `yt-dlp` service on Render, downloads the video and uploads it to B2 itself. The Worker reaches it only from the `DownloadTracker`, through `core/middlewares/fetchr.ts`. Its full API is in fetchr's README; this is the part the Worker relies on.

Every request sends:

```http
X-Client-Id: <DOWNLOADER_CLIENT_ID>
X-Fetchr-Code: <current rolling code>
Content-Type: application/json
```

Every authenticated reply, errors included, must carry `X-Fetchr-Next-Code`. The tracker stores it and sends it on the next request, one request at a time. `DOWNLOADER_SEED_CODE` is used only before the first rotation. A `401` carries no new code, because the code was rejected and didn't rotate.

| Method | Path | Body | Reply |
|---|---|---|---|
| POST | `/api/v1/downloads` | `{ "url": string }` | a fetchr download |
| GET | `/api/v1/downloads/{id}` | none | a fetchr download |

A fetchr download (`fetchrDownloadSchema` in `modules/downloads/utils.ts`):

```ts
{
  id: string
  source_url: string
  status: 'queued' | 'downloading' | 'uploading' | 'verifying' | 'completed' | 'failed' | 'cancelled'
  title: string | null
  filename: string | null      // bare file name; the Worker turns it into downloads/<client_id>/<id>/<filename>
  content_type: string | null
  filesize: number | null
  thumbnail: string | null     // bare file name ("thumbnail.jpg"), set only when completed; optional, treated as null when missing
  error: string | null
  created_at: string
  updated_at: string
}
```

Each alarm polls at most `DOWNLOAD_MAX_QUEUED` jobs. A poll fails on any non-2xx status, timeout, missing next code, or reply that doesn't match this shape. A failed poll is retried on the next alarm, up to `DOWNLOAD_MAX_POLL_FAILURES` times in a row.

### Renders (clip export)

Clip exports (see [Exports](#exports)) use fetchr's render endpoints: one source video already in B2, several clips cut from it, joined in order into **one MP4**, with the caption burned in. The `DownloadTracker` calls them, through the same `Fetchr` client and rolling code as downloads (`modules/exports/utils.ts`). fetchr's README has the full reference.

| Method | Path | Body | Reply |
|---|---|---|---|
| POST | `/api/v1/renders` | a render request (below) | `202`, a fetchr download |
| GET | `/api/v1/renders/{id}` | none | a fetchr download, or `404` |

The same auth headers and rolling code apply.

A render request:

```ts
{
  source_key: string                       // a download's B2 key: downloads/<client_id>/<download_id>/<filename>
  clips: { start: number; end: number }[]  // seconds into the source, in output order; 1–20, may overlap
  caption?: {                              // optional; null or missing = no caption
    headline: string                       // 1–200 chars, not blank
    details: string                        // 1–600 chars, may contain \n
    hold?: number                          // seconds fully visible, 0–600, default 6
    fade?: number                          // seconds to fade out after hold, 0–60, default 1.5
  } | null
}
```

- `source_key` must start with `downloads/<DOWNLOADER_CLIENT_ID>/`, with no `.`, `..` or empty segments. The Worker builds it from the download's stored `filename` key, never from the browser.
- Each clip's `end` is at least `0.5` after its `start` (the frontend's `config.editor.minClipSeconds`). The clips add up to at most fetchr's `FETCHR_RENDER_MAX_SECONDS` (default 600). Breaking either of these, or the source key rule, gets a `422` with `{ "detail": "<message>" }`.
- A clip that ends more than 0.1s past the source's end isn't refused up front. The job fails with `error: "Clip ends after the video does"`.

The reply has exactly the shape of a fetchr download, so `fetchrDownloadSchema` parses it unchanged:

| Field | For a render |
|---|---|
| `source_url` | the `source_key` |
| `status` | `queued` → `downloading` (fetching the source and rendering) → `uploading` → `verifying` → `completed` or `failed` |
| `title` | `null` |
| `filename`, `content_type`, `filesize` | `"clip.mp4"`, `"video/mp4"` and the size in bytes, once rendered |
| `thumbnail` | `"thumbnail.jpg"` (the output's first frame) on `completed`, else `null` |
| `error` | on `failed`, a short message such as `Clip ends after the video does`, `Source video not found` or `ffmpeg could not render the video` |

The output is written to `renders/<client_id>/<id>/clip.mp4` in B2, not `downloads/…`, so the key the Worker builds for a finished render uses the `renders/` prefix. Renders never show up in fetchr's download endpoints, and a render id gets `404` there (and the other way round).

The caption is shown from the start of the output, not of each clip. It's fully visible for `hold` seconds, then its alpha fades out over `fade` seconds. The editor previews the same timing (`frontend/src/editor/timeline.ts`).

**The caption fetchr draws** matches the editor's preview (`frontend/src/editor/ClipCaption.tsx`):

- **Look:** a full-width panel of black at 60%. The headline is navy on a gold bar per wrapped line, each bar as wide as its line, with a soft shadow. The details are cream with a soft shadow. Everything is centred, and sizes are fractions of the video width, like the preview's `cqw` units.
- **Fonts:** Montserrat ExtraBold for the headline and Bold for the details. Nepali uses Noto Sans Devanagari, shaped with libraqm so joined letters and vowel signs render correctly. Lines that mix English and Nepali switch font as they go.
- **Text:** never cut. The headline collapses extra whitespace and the details keep their line breaks, as in the preview. A caption taller than half the frame shrinks as a whole until it fits.
- **Differences from the preview:** the rendered caption sits flush on the bottom edge, since the preview only lifts it to clear the player's controls. Shrinking a very long caption to fit has no equivalent in the preview.
