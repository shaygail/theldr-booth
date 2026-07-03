"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useSessions } from "@/hooks/useSessions";
import type { Room } from "@/types/database";
import { PhotoboothSession } from "@/components/PhotoboothSession";
import { SessionPrompt } from "@/components/SessionPrompt";
import { Gallery } from "@/components/Gallery";
import { DaysSince } from "@/components/DaysSince";
import { LayoutPicker, layoutLabel, layoutPhotoCount } from "@/components/LayoutPicker";
import { StripTextEditor } from "@/components/StripTextEditor";
import { defaultStripText } from "@/lib/strip-text";
import type { PhotoboothLayout } from "@/types/database";

interface RoomViewProps {
  room: Room;
}

export function RoomView({ room }: RoomViewProps) {
  const { user } = useAuth();
  const { sessions, activeSession, refetch } = useSessions(room.id);
  const [inSession, setInSession] = useState(false);
  const [dismissedPrompt, setDismissedPrompt] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [layout, setLayout] = useState<PhotoboothLayout>("single");
  const [stripText, setStripText] = useState(() => defaultStripText());
  const [tab, setTab] = useState<"booth" | "gallery">("booth");
  const supabase = createClient();

  if (!user) return null;

  const isMember1 = room.member_1_id === user.id;
  const isMember2 = room.member_2_id === user.id;
  const partnerName = isMember1
    ? room.member_2_name ?? "Partner"
    : room.member_1_name ?? "Partner";
  const myName = isMember1
    ? room.member_1_name ?? "You"
    : room.member_2_name ?? "You";
  const partnerConnected = isMember1
    ? !!room.member_2_id
    : !!room.member_1_id;
  const isInitiator = activeSession?.initiated_by === user.id;

  const showPrompt =
    activeSession &&
    !isInitiator &&
    !inSession &&
    dismissedPrompt !== activeSession.id &&
    activeSession.status === "waiting";

  const startSession = async () => {
    if (!partnerConnected) return;
    setStarting(true);

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        room_id: room.id,
        initiated_by: user.id,
        status: "waiting",
        layout,
        strip_text: stripText.trim() || defaultStripText(),
        shot_index: 0,
        photo_1_urls: [],
        photo_2_urls: [],
      })
      .select()
      .single();

    if (!error && data) {
      setInSession(true);
      setTab("booth");
    }
    setStarting(false);
  };

  const handleAcceptPrompt = () => {
    setInSession(true);
    setTab("booth");
  };

  if (inSession && activeSession && activeSession.status !== "cancelled" && activeSession.status !== "captured") {
    return (
      <PhotoboothSession
        session={activeSession}
        room={room}
        userId={user.id}
        isMember1={isMember1}
        partnerName={partnerName}
        onComplete={() => {
          setInSession(false);
          refetch();
          setTab("gallery");
        }}
        onCancel={() => {
          setInSession(false);
          refetch();
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {showPrompt && (
        <SessionPrompt
          partnerName={partnerName}
          layout={activeSession.layout ?? "strip"}
          onAccept={handleAcceptPrompt}
          onDismiss={() => setDismissedPrompt(activeSession!.id)}
        />
      )}

      <div className="text-center mb-6">
        <p className="text-sm text-warm-600">
          Room <span className="font-mono font-semibold tracking-wider">{room.invite_code}</span>
        </p>
        <h2 className="font-serif text-2xl text-warm-800 mt-1">
          {myName} & {partnerName}
        </h2>
        <DaysSince sessions={sessions} />
      </div>

      <div className="flex rounded-2xl bg-warm-200/60 p-1 mb-6">
        <button
          onClick={() => setTab("booth")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            tab === "booth"
              ? "bg-cream text-warm-800 shadow-sm"
              : "text-warm-600"
          }`}
        >
          Photobooth
        </button>
        <button
          onClick={() => setTab("gallery")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            tab === "gallery"
              ? "bg-cream text-warm-800 shadow-sm"
              : "text-warm-600"
          }`}
        >
          Timeline
        </button>
      </div>

      {tab === "booth" ? (
        <div className="flex flex-col items-center gap-6 py-8">
          {!partnerConnected ? (
            <div className="text-center space-y-4">
              <span className="text-5xl block">💌</span>
              <p className="text-warm-700 font-medium">
                Waiting for your partner to join…
              </p>
              <div className="bg-cream rounded-2xl p-6 border border-gold-200">
                <p className="text-sm text-warm-600 mb-2">Share this code:</p>
                <p className="text-3xl font-mono font-bold tracking-[0.3em] text-coral-500">
                  {room.invite_code}
                </p>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/room/${room.invite_code}`;
                    navigator.clipboard.writeText(url);
                  }}
                  className="btn-secondary text-sm mt-4"
                >
                  Copy invite link
                </button>
              </div>
            </div>
          ) : activeSession && activeSession.status === "waiting" ? (
            <div className="text-center space-y-4">
              {isInitiator ? (
                <>
                  <p className="text-warm-700">
                    Waiting for {partnerName} to open the photobooth…
                  </p>
                  <p className="text-sm text-warm-500">
                    {layoutLabel(activeSession.layout ?? "single")} ·{" "}
                    {layoutPhotoCount(activeSession.layout ?? "single")} photo
                    {layoutPhotoCount(activeSession.layout ?? "single") > 1
                      ? "s"
                      : ""}
                  </p>
                  <button
                    onClick={() => setInSession(true)}
                    className="btn-primary"
                  >
                    Open camera
                  </button>
                </>
              ) : (
                <>
                  <p className="text-warm-700">
                    {partnerName} started a photobooth session!
                  </p>
                  <p className="text-sm text-warm-500">
                    {layoutLabel(activeSession.layout ?? "single")} ·{" "}
                    {layoutPhotoCount(activeSession.layout ?? "single")} photo
                    {layoutPhotoCount(activeSession.layout ?? "single") > 1
                      ? "s"
                      : ""}
                  </p>
                  <button
                    onClick={() => setInSession(true)}
                    className="btn-primary"
                  >
                    Join session
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <span className="text-6xl">📸</span>
              <p className="text-warm-700 text-center max-w-xs">
                Ready to capture a moment together, even from far away?
              </p>
              <LayoutPicker value={layout} onChange={setLayout} />
              <StripTextEditor value={stripText} onChange={setStripText} />
              <button
                onClick={startSession}
                disabled={starting}
                className="btn-primary text-lg px-8 py-4"
              >
                {starting ? "Starting…" : "Start photobooth"}
              </button>
            </>
          )}
        </div>
      ) : (
        <Gallery sessions={sessions} onUpdate={refetch} />
      )}
    </div>
  );
}
