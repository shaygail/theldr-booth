-- Run this in Supabase SQL Editor if features aren't working.
-- Safe to run multiple times.

-- Layout + multi-shot columns (002)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS layout TEXT NOT NULL DEFAULT 'strip',
  ADD COLUMN IF NOT EXISTS shot_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_1_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS photo_2_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_layout_check;
ALTER TABLE sessions
  ADD CONSTRAINT sessions_layout_check
  CHECK (layout IN ('single', 'strip', 'columns'));

-- Strip text column (004)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS strip_text TEXT;

-- Countdown duration (006)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS countdown_seconds INTEGER NOT NULL DEFAULT 10;

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_countdown_seconds_check;
ALTER TABLE sessions
  ADD CONSTRAINT sessions_countdown_seconds_check
  CHECK (countdown_seconds IN (5, 10));
