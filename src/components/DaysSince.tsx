"use client";

import type { Session } from "@/types/database";

interface DaysSinceProps {
  sessions: Session[];
}

export function DaysSince({ sessions }: DaysSinceProps) {
  const captured = sessions.filter((s) => s.status === "captured");

  if (captured.length === 0) {
    return (
      <p className="text-sm text-warm-600 text-center">
        No photos yet — time for your first photobooth moment!
      </p>
    );
  }

  const lastDate = new Date(captured[0].created_at);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return (
      <p className="text-sm text-sage-600 text-center font-medium">
        You took a photo together today 💛
      </p>
    );
  }

  return (
    <p className="text-sm text-warm-600 text-center">
      <span className="font-semibold text-coral-500">{days}</span>{" "}
      {days === 1 ? "day" : "days"} since your last photobooth together
    </p>
  );
}
