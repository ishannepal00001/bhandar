-- The B2 key of a download's thumbnail (downloads/<client_id>/<id>/thumbnail.jpg); null when fetchr couldn't make one,
-- and for downloads from before thumbnails.
ALTER TABLE downloads ADD COLUMN thumbnail TEXT;
