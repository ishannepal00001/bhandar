-- Videos uploaded from the browser to export clips from. The file goes straight to B2; this row tracks it.
CREATE TABLE uploads (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The file's name on the user's device, for naming exports.
  name TEXT NOT NULL,
  -- The B2 object key: uploads/<client_id>/<id>/source<.ext>.
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  -- Bytes, as announced before the upload; checked against B2 when it completes.
  size INTEGER NOT NULL,
  -- pending until the browser reports the upload finished and B2 has the file at the announced size.
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready')),
  created_at TEXT NOT NULL
);

CREATE INDEX uploads_created ON uploads (created_at);

-- An export's source is now a download or an upload, so download_id becomes nullable next to a new upload_id, and
-- exactly one of them is set. SQLite can't change a column's constraints in place, so the table is rebuilt.
CREATE TABLE exports_new (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The source download or upload. Not foreign keys, so deleting the download keeps its exports.
  download_id TEXT,
  upload_id TEXT,
  title TEXT,
  clips TEXT NOT NULL,
  caption TEXT,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'cancelled')),
  filename TEXT,
  content_type TEXT,
  filesize INTEGER,
  thumbnail TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((download_id IS NULL) != (upload_id IS NULL))
);

INSERT INTO exports_new (id, user_id, download_id, upload_id, title, clips, caption, status, filename, content_type,
  filesize, thumbnail, error, created_at, updated_at)
SELECT id, user_id, download_id, NULL, title, clips, caption, status, filename, content_type, filesize, thumbnail, error,
  created_at, updated_at
FROM exports;

DROP TABLE exports;
ALTER TABLE exports_new RENAME TO exports;

CREATE INDEX exports_user_created ON exports (user_id, created_at DESC);
CREATE INDEX exports_upload ON exports (upload_id);
