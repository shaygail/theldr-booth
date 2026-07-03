"use client";

import type { PhotoFilter } from "@/types/database";
import { FILTER_OPTIONS } from "@/lib/filters";
import type { WebcamState } from "@/hooks/useWebcam";

interface PhotoCaptureProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  state: WebcamState;
  error: string | null;
  filter: PhotoFilter;
  onFilterChange: (filter: PhotoFilter) => void;
  onStart: () => void;
  onRetry: () => void;
}

export function PhotoCapture({
  videoRef,
  canvasRef,
  state,
  error,
  filter,
  onFilterChange,
  onStart,
  onRetry,
}: PhotoCaptureProps) {
  const showVideo = state === "active";

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative w-full aspect-[4/5] max-w-sm rounded-2xl overflow-hidden shadow-xl bg-warm-200">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1] ${
            showVideo ? "block" : "sr-only"
          }`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {state === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="text-4xl">📷</span>
            <p className="text-sm text-warm-600">
              Tap below to open your camera
            </p>
            <button onClick={onStart} className="btn-primary">
              Open camera
            </button>
          </div>
        )}

        {state === "requesting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin" />
            <p className="text-warm-600 text-sm">Starting camera…</p>
          </div>
        )}

        {(state === "denied" || state === "error") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <span className="text-4xl mb-3">📷</span>
            <p className="text-warm-700 text-sm mb-4">{error}</p>
            <button onClick={onRetry} className="btn-secondary">
              Try again
            </button>
          </div>
        )}
      </div>

      {showVideo && (
        <div className="flex gap-2 flex-wrap justify-center">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFilterChange(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === opt.value
                  ? "bg-coral-500 text-white"
                  : "bg-warm-200 text-warm-700 hover:bg-warm-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
