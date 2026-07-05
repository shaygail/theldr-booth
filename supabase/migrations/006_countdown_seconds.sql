-- Countdown duration option (5 or 10 seconds)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS countdown_seconds INTEGER NOT NULL DEFAULT 10
    CHECK (countdown_seconds IN (5, 10));
