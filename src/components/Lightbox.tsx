"use client";

import { useState } from "react";
import type { Session } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { downloadImage, photoboothFilename } from "@/lib/download-image";
import { regenerateCombined } from "@/lib/regenerate-combined";
import { resolveStripText } from "@/lib/strip-text";
import { canRegenerateSession } from "@/lib/session-shots";

interface LightboxProps {
  session: Session;
  onClose: () => void;
  onUpdate: (close?: boolean) => void;
}

export function Lightbox({ session, onClose, onUpdate }: LightboxProps) {
  const [caption, setCaption] = useState(session.caption ?? "");
  const [stripText, setStripText] = useState(
    resolveStripText(session.strip_text, session.created_at)
  );
  const [previewUrl, setPreviewUrl] = useState(
    session.combined_url ?? session.photo_1_url
  );
  const [savingCaption, setSavingCaption] = useState(false);
  const [savingStrip, setSavingStrip] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [stripError, setStripError] = useState<string | null>(null);
  const supabase = createClient();

  const [lastSavedStrip, setLastSavedStrip] = useState(
    resolveStripText(session.strip_text, session.created_at)
  );

  const toggleFavorite = async () => {
    await supabase
      .from("sessions")
      .update({ favorited: !session.favorited })
      .eq("id", session.id);
    onUpdate(false);
  };

  const saveCaption = async () => {
    setSavingCaption(true);
    await supabase
      .from("sessions")
      .update({ caption: caption.trim() || null })
      .eq("id", session.id);
    setSavingCaption(false);
    onUpdate(false);
  };

  const canEditStrip = canRegenerateSession(session);

  const saveStripText = async () => {
    if (!canEditStrip) {
      setStripError(
        "This photo was saved before strip editing was available. Take a new session to customize the text."
      );
      return;
    }

    setSavingStrip(true);
    setStripError(null);

    try {
      const publicUrl = await regenerateCombined(
        session,
        stripText.trim(),
        supabase
      );
      setPreviewUrl(`${publicUrl}?t=${Date.now()}`);
      setLastSavedStrip(stripText.trim());
      onUpdate(false);
    } catch (err) {
      setStripError(
        err instanceof Error
          ? err.message
          : "Could not update strip — try again."
      );
    } finally {
      setSavingStrip(false);
    }
  };

  const handleDownload = async () => {
    if (!previewUrl) return;

    setDownloading(true);
    setDownloadError(null);

    try {
      await downloadImage(previewUrl, photoboothFilename(session.created_at));
    } catch {
      setDownloadError("Download failed — try again.");
    } finally {
      setDownloading(false);
    }
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
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Photobooth moment"
            className="w-full rounded-t-2xl"
          />
        )}

        <div className="p-4 space-y-3">
          <time className="text-sm text-warm-600 block">
            {new Date(session.created_at).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>

          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={!previewUrl || downloading}
              className="btn-primary flex-1 text-sm py-2.5"
            >
              {downloading ? "Downloading…" : "Download"}
            </button>
            <button
              onClick={toggleFavorite}
              className="btn-secondary text-2xl py-2 px-3 transition-transform hover:scale-110"
              aria-label={session.favorited ? "Unfavorite" : "Favorite"}
            >
              {session.favorited ? "❤️" : "🤍"}
            </button>
          </div>

          {downloadError && (
            <p className="text-sm text-coral-600 text-center">{downloadError}</p>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide">
              Strip text
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={stripText}
                onChange={(e) => setStripText(e.target.value)}
                placeholder="Text on your print…"
                className="input flex-1 text-sm"
                maxLength={80}
              />
              <button
                onClick={saveStripText}
                disabled={
                  savingStrip ||
                  !canEditStrip ||
                  stripText.trim() === lastSavedStrip.trim()
                }
                className="btn-secondary text-sm py-2 px-3 whitespace-nowrap"
              >
                {savingStrip ? "Updating…" : "Update print"}
              </button>
            </div>
            {!canEditStrip && (
              <p className="text-xs text-warm-500">
                Take a new photobooth session to edit the text on this print.
              </p>
            )}
            {stripError && (
              <p className="text-sm text-coral-600">{stripError}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide">
              Caption
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Private note for your timeline…"
                className="input flex-1 text-sm"
                maxLength={200}
              />
              <button
                onClick={saveCaption}
                disabled={
                  savingCaption || caption === (session.caption ?? "")
                }
                className="btn-secondary text-sm py-2 px-3"
              >
                Save
              </button>
            </div>
          </div>

          <button onClick={onClose} className="btn-ghost w-full text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
