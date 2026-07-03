-- Custom footer text on combined photobooth prints
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS strip_text TEXT;
