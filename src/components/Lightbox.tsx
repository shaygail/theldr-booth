"use client";

import { useState } from "react";
import type { Session } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

interface LightboxProps {
  session: Session;
  onClose: () => void;
  onUpdate: () => void;
}

export function Lightbox({ session, onClose, onUpdate }: LightboxProps) {
  const [caption, setCaption] = useState(session.caption ?? "");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const imageUrl = session.combined_url ?? session.photo_1_url;

  const toggleFavorite = async () => {
    await supabase
      .from("sessions")
      .update({ favorited: !session.favorited })
      .eq("id", session.id);
    onUpdate();
  };

  const saveCaption = async () => {
    setSaving(true);
    await supabase
      .from("sessions")
      .update({ caption: caption.trim() || null })
      .eq("id", session.id);
    setSaving(false);
    onUpdate();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-warm-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-cream rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Photobooth moment"
            className="w-full rounded-t-2xl"
          />
        )}

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <time className="text-sm text-warm-600">
              {new Date(session.created_at).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <button
              onClick={toggleFavorite}
              className="text-2xl transition-transform hover:scale-110"
              aria-label={session.favorited ? "Unfavorite" : "Favorite"}
            >
              {session.favorited ? "❤️" : "🤍"}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption…"
              className="input flex-1 text-sm"
              maxLength={200}
            />
            <button
              onClick={saveCaption}
              disabled={saving || caption === (session.caption ?? "")}
              className="btn-secondary text-sm py-2 px-3"
            >
              Save
            </button>
          </div>

          <button onClick={onClose} className="btn-ghost w-full text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
