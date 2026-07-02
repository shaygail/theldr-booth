# theldr booth

A virtual photobooth for two people in a long-distance relationship to take synchronized "together" photos, even when apart.

## Tech stack

- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **Supabase** — Postgres, Realtime, Storage, Anonymous Auth
- **getUserMedia** — browser webcam access
- Deployable to **Vercel**

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Authentication → Providers**, enable **Anonymous sign-ins**.
3. In **SQL Editor**, run the migration at `supabase/migrations/001_schema.sql`.
4. In **Project Settings → API**, copy your project URL and anon key.

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

1. **Create or join a room** — One partner creates a room and shares the 6-character code or invite link. The other joins with the code. The room is your permanent shared space.
2. **Start a photobooth session** — Either partner taps "Start photobooth." The other gets a realtime prompt.
3. **Get ready** — Both open their cameras and tap "I'm ready!" When both are ready, a synced 3-2-1 countdown runs locally on each device.
4. **Capture & combine** — Photos upload to Supabase Storage and are stitched side-by-side into a photo strip with a date stamp.
5. **Timeline** — All moments appear in a shared gallery. Tap to open the lightbox, add captions, or favorite a photo.

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Landing — create/join room
│   └── room/[code]/page.tsx  # Room view — photobooth + gallery
├── components/
│   ├── AuthProvider.tsx      # Anonymous auth + display name
│   ├── RoomCreate.tsx        # Create room flow
│   ├── RoomJoin.tsx          # Join room flow
│   ├── RoomView.tsx          # Main room UI
│   ├── PhotoboothSession.tsx # Session orchestration
│   ├── PhotoCapture.tsx      # Webcam preview + filters
│   ├── ReadyToggle.tsx       # Ready/un-ready toggle
│   ├── CountdownTimer.tsx    # 3-2-1 countdown overlay
│   ├── Gallery.tsx           # Shared timeline
│   ├── Lightbox.tsx          # Full-screen photo view
│   └── SessionPrompt.tsx     # Partner started session notification
├── hooks/
│   ├── useWebcam.ts          # getUserMedia wrapper
│   ├── useRoom.ts            # Room realtime subscription
│   └── useSessions.ts        # Sessions realtime subscription
└── lib/
    ├── supabase/             # Supabase clients
    ├── combine-photos.ts     # Canvas photo strip compositor
    └── filters.ts              # B&W, warm, vintage filters
```

## Deploy to Vercel

1. Push to GitHub.
2. Import the repo in [Vercel](https://vercel.com).
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables.
4. Deploy.

## Edge cases handled

- Camera permission denied — clear error with retry
- Partner hasn't joined yet — share code / copy invite link UI
- Partner disconnects before ready — cancel session button
- Upload failure — error state with retry guidance
- Un-readying after partner is ready — countdown resets until both ready again
- Room full — error when a third person tries to join

## Extras included

- Photo filters (Original, B&W, Warm, Vintage)
- "X days since last photobooth" counter
- In-app session prompt when partner starts a session
