"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  onComplete: () => void;
  seconds?: number;
}

export function CountdownTimer({ onComplete, seconds = 3 }: CountdownTimerProps) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-900/60 backdrop-blur-sm">
      <div
        key={count}
        className="text-[8rem] font-serif font-bold text-cream animate-countdown"
        aria-live="assertive"
        aria-label={`${count}`}
      >
        {count > 0 ? count : "📸"}
      </div>
    </div>
  );
}
