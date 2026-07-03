"use client";

import type { PhotoboothLayout } from "@/types/database";
import { layoutLabel, layoutPhotoCount } from "@/components/LayoutPicker";

interface SessionPromptProps {
  partnerName: string;
  layout: PhotoboothLayout;
  onAccept: () => void;
  onDismiss: () => void;
}

export function SessionPrompt({
  partnerName,
  layout,
  onAccept,
  onDismiss,
}: SessionPromptProps) {
  return (
    <div className="fixed inset-x-4 top-4 z-40 animate-slide-down">
      <div className="max-w-md mx-auto bg-cream rounded-2xl shadow-xl border border-gold-300 p-4 flex items-start gap-3">
        <span className="text-2xl">📸</span>
        <div className="flex-1">
          <p className="font-semibold text-warm-800">
            {partnerName} wants to take a photo with you!
          </p>
          <p className="text-sm text-warm-600 mt-0.5">
            {layoutLabel(layout)} · {layoutPhotoCount(layout)} photo
            {layoutPhotoCount(layout) > 1 ? "s" : ""} — open your camera and get
            ready.
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={onAccept} className="btn-primary text-sm py-2 px-4">
              Let&apos;s go!
            </button>
            <button onClick={onDismiss} className="btn-ghost text-sm py-2 px-4">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
