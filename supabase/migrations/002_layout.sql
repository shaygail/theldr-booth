-- Photobooth layout options and multi-shot support
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS layout TEXT NOT NULL DEFAULT 'strip'
    CHECK (layout IN ('strip', 'columns')),
  ADD COLUMN IF NOT EXISTS shot_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_1_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS photo_2_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
