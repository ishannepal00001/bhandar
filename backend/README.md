# Bhandar backend

Bun + Hono API that downloads Facebook videos with yt-dlp, stores them in Backblaze B2, keeps history in SQLite and streams progress over Server-Sent Events.

## Requirements
- Bun 1.3+
- `yt-dlp` and `ffmpeg` on your PATH
- A private Backblaze B2 bucket and an application key with access to it

## Setup
```sh
bun install
cp .env.example .env   # fill in the B2_* values
bun run dev            # http://127.0.0.1:3000
```
Run the frontend (`cd ../frontend && bun run dev`) and it forwards `/api` to this server.

## API
| Method | Path | |
|---|---|---|
| POST | `/api/downloads` | `{ "url": "<facebook video>", "quality": "hd" \| "sd" \| "audio" }` |
| GET | `/api/downloads` | `?status=active\|done\|failed`, `?q=title search` |
| GET | `/api/downloads/:id` | one download |
| GET | `/api/downloads/:id/file` | redirects to a 1-hour B2 link; add `?download` to save instead of play |
| DELETE | `/api/downloads/:id` | cancels an active download, otherwise deletes the file and record |
| GET | `/api/stats` | numbers for the dashboard cards |
| GET | `/api/events` | SSE: `snapshot`, `created`, `updated`, `progress`, `deleted`, `ping` |

## Scripts
`bun run dev` · `bun run start` · `bun test` · `bun run typecheck`
