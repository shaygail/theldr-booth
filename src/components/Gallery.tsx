"use client";

import { useState } from "react";
import type { Session } from "@/types/database";
import { Lightbox } from "@/components/Lightbox";

interface GalleryProps {
  sessions: Session[];
  onUpdate: () => void;
}

export function Gallery({ sessions, onUpdate }: GalleryProps) {
  const [selected, setSelected] = useState<Session | null>(null);

  const captured = sessions.filter(
    (s) => s.status === "captured" && (s.combined_url || s.photo_1_url)
  );

  if (captured.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-5xl block mb-4">🖼️</span>
        <p className="text-warm-600">Your timeline is empty.</p>
        <p className="text-sm text-warm-500 mt-1">
          Start a photobooth session to capture your first moment together.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {captured.map((session) => (
          <button
            key={session.id}
            onClick={() => setSelected(session)}
            className="w-full text-left group"
          >
            <div className="rounded-2xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow border border-gold-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={session.combined_url ?? session.photo_1_url!}
                alt={session.caption ?? "Photobooth moment"}
                className="w-full aspect-[16/10] object-cover"
              />
              <div className="px-4 py-3 flex items-center justify-between bg-cream">
                <time className="text-sm text-warm-600">
                  {new Date(session.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                <div className="flex items-center gap-2">
                  {session.caption && (
                    <span className="text-sm text-warm-700 truncate max-w-[160px]">
                      {session.caption}
                    </span>
                  )}
                  {session.favorited && <span>❤️</span>}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <Lightbox
          session={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => {
            onUpdate();
            setSelected(null);
          }}
        />
      )}
    </>
  );
}
