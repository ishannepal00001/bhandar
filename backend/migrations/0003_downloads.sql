-- Finished downloads (completed, failed or cancelled). Queued jobs live in the DownloadTracker Durable Object.
CREATE TABLE downloads (
  -- The Render job id.
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'cancelled')),
  title TEXT,
  -- The B2 object key; set when status is completed.
  filename TEXT,
  content_type TEXT,
  filesize INTEGER,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX downloads_user_created ON downloads (user_id, created_at DESC);
