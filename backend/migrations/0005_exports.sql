-- Finished clip exports (completed, failed or cancelled), each one fetchr render of clips from a download joined into
-- one MP4. Queued exports live in the DownloadTracker Durable Object.
CREATE TABLE exports (
  -- The fetchr render id.
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The download the clips were cut from. Not a foreign key, so deleting the download keeps its exports.
  download_id TEXT NOT NULL,
  -- The download's title when the export was made, for naming the saved file.
  title TEXT,
  -- JSON: [{ "start": number, "end": number }], in output order.
  clips TEXT NOT NULL,
  -- JSON: { "headline", "details", "hold", "fade" }, or null for no caption.
  caption TEXT,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'cancelled')),
  -- The B2 object key (renders/<client_id>/<id>/clip.mp4); set when status is completed.
  filename TEXT,
  content_type TEXT,
  filesize INTEGER,
  -- The B2 key of the first-frame thumbnail; null when fetchr couldn't make one.
  thumbnail TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX exports_user_created ON exports (user_id, created_at DESC);
