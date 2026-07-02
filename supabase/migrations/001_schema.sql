-- theldr booth — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms: permanent shared spaces for two partners
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  member_1_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  member_2_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  member_1_name TEXT,
  member_2_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rooms_invite_code ON rooms(invite_code);
CREATE INDEX idx_rooms_member_1 ON rooms(member_1_id);
CREATE INDEX idx_rooms_member_2 ON rooms(member_2_id);

-- Photobooth sessions within a room
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'both_ready', 'captured', 'cancelled')),
  ready_member_1 BOOLEAN NOT NULL DEFAULT false,
  ready_member_2 BOOLEAN NOT NULL DEFAULT false,
  photo_1_url TEXT,
  photo_2_url TEXT,
  combined_url TEXT,
  caption TEXT,
  favorited BOOLEAN NOT NULL DEFAULT false,
  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_room_id ON sessions(room_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can look up rooms (needed for join-by-code flow)
CREATE POLICY "Authenticated users can view rooms"
  ON rooms FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Anyone authenticated can create a room (becomes member_1)
CREATE POLICY "Authenticated users can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid() = member_1_id);

-- Members can update their room (join as member_2, update names)
CREATE POLICY "Members can update their room"
  ON rooms FOR UPDATE
  USING (
    auth.uid() = member_1_id OR auth.uid() = member_2_id
  );

-- Allow joining: user can update room to become member_2 if slot is open
CREATE POLICY "Users can join open rooms"
  ON rooms FOR UPDATE
  USING (
    member_2_id IS NULL AND auth.uid() IS NOT NULL
  );

-- Sessions: members can view sessions in their room
CREATE POLICY "Members can view sessions"
  ON sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = sessions.room_id
        AND (rooms.member_1_id = auth.uid() OR rooms.member_2_id = auth.uid())
    )
  );

-- Members can create sessions in their room
CREATE POLICY "Members can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_id
        AND (rooms.member_1_id = auth.uid() OR rooms.member_2_id = auth.uid())
    )
  );

-- Members can update sessions in their room
CREATE POLICY "Members can update sessions"
  ON sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = sessions.room_id
        AND (rooms.member_1_id = auth.uid() OR rooms.member_2_id = auth.uid())
    )
  );

-- Storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: room members can upload/read photos in their room folder
CREATE POLICY "Room members can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can view photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can update photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'photos'
    AND auth.role() = 'authenticated'
  );

-- Enable Realtime for sessions and rooms
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
