"use client";

import type { PhotoboothLayout } from "@/types/database";
import { photosPerSession } from "@/types/database";

interface LayoutPickerProps {
  value: PhotoboothLayout;
  onChange: (layout: PhotoboothLayout) => void;
}

function SinglePreview({ selected }: { selected: boolean }) {
  return (
    <div
      className={`flex gap-0.5 p-3 rounded-xl bg-warm-200/50 h-14 ${
        selected ? "ring-2 ring-coral-500" : ""
      }`}
    >
      <div className="flex-1 bg-coral-500/40 rounded-sm" />
      <div className="w-px bg-coral-500/60" />
      <div className="flex-1 bg-sage-500/40 rounded-sm" />
    </div>
  );
}

function StripPreview({ selected }: { selected: boolean }) {
  return (
    <div
      className={`flex flex-col gap-1 p-3 rounded-xl bg-warm-200/50 ${
        selected ? "ring-2 ring-coral-500" : ""
      }`}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-0.5 h-3 rounded-sm overflow-hidden">
          <div className="flex-1 bg-coral-500/40" />
          <div className="w-px bg-coral-500/60" />
          <div className="flex-1 bg-sage-500/40" />
        </div>
      ))}
    </div>
  );
}

function ColumnsPreview({ selected }: { selected: boolean }) {
  return (
    <div
      className={`flex gap-1 p-3 rounded-xl bg-warm-200/50 ${
        selected ? "ring-2 ring-coral-500" : ""
      }`}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 flex gap-0.5 h-14 rounded-sm overflow-hidden"
        >
          <div className="flex-1 bg-coral-500/40" />
          <div className="w-px bg-coral-500/60" />
          <div className="flex-1 bg-sage-500/40" />
        </div>
      ))}
    </div>
  );
}

const OPTIONS: Array<{
  id: PhotoboothLayout;
  label: string;
  description: string;
  Preview: typeof SinglePreview;
}> = [
  {
    id: "single",
    label: "1 photo",
    description: "One shot together — quick and simple",
    Preview: SinglePreview,
  },
  {
    id: "strip",
    label: "Photo strip",
    description: "4 shots stacked vertically",
    Preview: StripPreview,
  },
  {
    id: "columns",
    label: "4 columns",
    description: "4 shots side by side",
    Preview: ColumnsPreview,
  },
];

export function LayoutPicker({ value, onChange }: LayoutPickerProps) {
  return (
    <div className="w-full max-w-md space-y-3">
      <p className="text-sm font-semibold text-warm-700 text-center">
        Choose your layout
      </p>
      <p className="text-xs text-warm-500 text-center -mt-1">
        {photosPerSession(value)} photo{photosPerSession(value) > 1 ? "s" : ""}{" "}
        per session
      </p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(({ id, label, description, Preview }) => {
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`text-left rounded-2xl border p-2.5 transition-all ${
                selected
                  ? "border-coral-500 bg-coral-500/5 shadow-md"
                  : "border-gold-200 bg-cream hover:border-gold-300"
              }`}
            >
              <Preview selected={selected} />
              <p className="font-semibold text-xs text-warm-800 mt-2">
                {label}
              </p>
              <p className="text-[10px] text-warm-500 mt-0.5 leading-snug">
                {description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function layoutLabel(layout: PhotoboothLayout): string {
  switch (layout) {
    case "single":
      return "1 photo";
    case "strip":
      return "Photo strip";
    case "columns":
      return "4 columns";
  }
}

export function layoutPhotoCount(layout: PhotoboothLayout): number {
  return photosPerSession(layout);
}
