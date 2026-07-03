-- Allow single-photo layout option
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_layout_check;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_layout_check
  CHECK (layout IN ('single', 'strip', 'columns'));
