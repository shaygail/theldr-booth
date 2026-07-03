"use client";

import { defaultStripText } from "@/lib/strip-text";

interface StripTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void | Promise<void>;
  compact?: boolean;
}

export function StripTextEditor({
  value,
  onChange,
  onCommit,
  compact = false,
}: StripTextEditorProps) {
  return (
    <div className={`w-full ${compact ? "max-w-sm" : "max-w-md"} space-y-2`}>
      <label className="block text-sm font-semibold text-warm-700 text-center">
        Strip text
      </label>
      <p className="text-xs text-warm-500 text-center -mt-1">
        Appears at the bottom of your print
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onCommit?.(value)}
        placeholder="e.g. Saturday, July 4, 2026"
        className="input text-sm text-center"
        maxLength={80}
      />
      <button
        type="button"
        onClick={() => {
          const next = defaultStripText();
          onChange(next);
          onCommit?.(next);
        }}
        className="btn-ghost text-xs w-full py-1"
      >
        Reset to today&apos;s date
      </button>
    </div>
  );
}
