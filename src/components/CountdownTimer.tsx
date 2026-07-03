"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  onComplete: () => void;
  seconds?: number;
}

export function CountdownTimer({ onComplete, seconds = 10 }: CountdownTimerProps) {
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
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none rounded-2xl">
      <div
        key={count}
        className="text-7xl sm:text-8xl font-serif font-bold text-cream animate-countdown drop-shadow-[0_2px_16px_rgba(0,0,0,0.85)]"
        aria-live="assertive"
        aria-label={`${count}`}
      >
        {count > 0 ? count : "📸"}
      </div>
    </div>
  );
}
