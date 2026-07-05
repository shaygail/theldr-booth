"use client";

import type { CountdownSeconds } from "@/types/database";

interface CountdownPickerProps {
  value: CountdownSeconds;
  onChange: (value: CountdownSeconds) => void;
}

export function CountdownPicker({ value, onChange }: CountdownPickerProps) {
  return (
    <div className="w-full max-w-md space-y-2">
      <p className="text-sm font-semibold text-warm-700 text-center">
        Countdown timer
      </p>
      <div className="flex rounded-2xl bg-warm-200/60 p-1">
        {([5, 10] as CountdownSeconds[]).map((seconds) => (
          <button
            key={seconds}
            type="button"
            onClick={() => onChange(seconds)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              value === seconds
                ? "bg-cream text-warm-800 shadow-sm"
                : "text-warm-600"
            }`}
          >
            {seconds}s
          </button>
        ))}
      </div>
    </div>
  );
}

export function countdownLabel(seconds: CountdownSeconds): string {
  return `${seconds}s countdown`;
}
