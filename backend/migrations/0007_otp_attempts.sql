-- Wrong codes entered while a code was live; the code is deleted once this reaches OTP_MAX_ATTEMPTS.
-- users.password now holds "pbkdf2_sha256$<iterations>$<hex>" rather than SHA-256 of "<salt>:<password>"; the column
-- itself is unchanged, so only the seed's value has to be regenerated (see 0002_seed_user.sql.example).
ALTER TABLE otp ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
