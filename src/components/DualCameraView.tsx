"use client";

import type { PhotoFilter } from "@/types/database";
import { FILTER_OPTIONS } from "@/lib/filters";
import { BACKGROUND_OPTIONS, type BackgroundId } from "@/lib/backgrounds";
import { supportsVirtualBackground } from "@/lib/device";
import type { WebcamState } from "@/hooks/useWebcam";
import type { PartnerVideoStatus } from "@/hooks/usePartnerVideo";

interface DualCameraViewProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  partnerVideoRef: React.RefObject<HTMLVideoElement | null>;
  localOutputRef: React.RefObject<HTMLCanvasElement | null>;
  partnerOutputRef: React.RefObject<HTMLCanvasElement | null>;
  localShowProcessed: boolean;
  partnerShowProcessed: boolean;
  backgroundLoading: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  state: WebcamState;
  error: string | null;
  filter: PhotoFilter;
  background: BackgroundId;
  partnerName: string;
  partnerStatus: PartnerVideoStatus;
  onFilterChange: (filter: PhotoFilter) => void;
  onBackgroundChange: (background: BackgroundId) => void;
  onStart: () => void;
  onRetry: () => void;
}

function CameraPane({
  videoRef,
  outputRef,
  showProcessed,
  virtualBgActive,
  label,
  mirrored = false,
  overlay,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  outputRef?: React.RefObject<HTMLCanvasElement | null>;
  showProcessed: boolean;
  virtualBgActive: boolean;
  label: string;
  mirrored?: boolean;
  overlay?: React.ReactNode;
}) {
  return (
    <div className="relative flex-1 min-w-0 aspect-[3/4] bg-warm-300 overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover ${
          mirrored ? "scale-x-[-1]" : ""
        } ${showProcessed ? "invisible" : "visible"}`}
      />
      {virtualBgActive && outputRef && (
        <canvas
          ref={outputRef}
          className={`absolute inset-0 w-full h-full ${
            showProcessed ? "visible" : "invisible"
          }`}
        />
      )}
      {overlay}
      <span className="absolute bottom-2 left-2 z-10 text-xs font-semibold text-white bg-warm-900/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}

export function DualCameraView({
  localVideoRef,
  partnerVideoRef,
  localOutputRef,
  partnerOutputRef,
  localShowProcessed,
  partnerShowProcessed,
  backgroundLoading,
  canvasRef,
  state,
  error,
  filter,
  background,
  partnerName,
  partnerStatus,
  onFilterChange,
  onBackgroundChange,
  onStart,
  onRetry,
}: DualCameraViewProps) {
  const cameraActive = state === "active";
  const vbSupported = supportsVirtualBackground();
  const localVirtualActive =
    vbSupported && cameraActive && background !== "none";
  const partnerVirtualActive =
    vbSupported && partnerStatus === "connected" && background !== "none";

  const localOverlay = !cameraActive ? (
    <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center bg-warm-200 p-4 text-center">
      {state === "idle" && (
        <>
          <span className="text-3xl mb-2">📷</span>
          <p className="text-xs text-warm-600 mb-3">
            Open your camera to see you both
          </p>
          <button onClick={onStart} className="btn-primary text-sm py-2 px-4">
            Open camera
          </button>
        </>
      )}
      {state === "requesting" && (
        <>
          <div className="w-8 h-8 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin mb-2" />
          <p className="text-warm-600 text-xs">Starting camera…</p>
        </>
      )}
      {(state === "denied" || state === "error") && (
        <>
          <span className="text-3xl mb-2">📷</span>
          <p className="text-warm-700 text-xs mb-3">{error}</p>
          <button onClick={onRetry} className="btn-secondary text-sm py-2 px-4">
            Try again
          </button>
        </>
      )}
    </div>
  ) : null;

  const partnerOverlay =
    partnerStatus !== "connected" ? (
      <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center bg-warm-200 p-3 text-center">
        {!cameraActive ? (
          <p className="text-xs text-warm-500">{partnerName}</p>
        ) : (
          <>
            <div className="w-8 h-8 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin mb-2" />
            <p className="text-xs text-warm-600">
              {partnerStatus === "waiting"
                ? `Waiting for ${partnerName}…`
                : `Connecting to ${partnerName}…`}
            </p>
          </>
        )}
      </div>
    ) : null;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {backgroundLoading && background !== "none" && vbSupported && (
        <p className="text-xs text-warm-600 animate-pulse">
          Loading virtual backgrounds…
        </p>
      )}
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-xl border border-gold-200">
        <div className="flex divide-x-2 divide-coral-500/30">
          <CameraPane
            videoRef={localVideoRef}
            outputRef={localOutputRef}
            showProcessed={localShowProcessed}
            virtualBgActive={localVirtualActive}
            label="You"
            mirrored
            overlay={localOverlay}
          />
          <CameraPane
            videoRef={partnerVideoRef}
            outputRef={partnerOutputRef}
            showProcessed={partnerShowProcessed}
            virtualBgActive={partnerVirtualActive}
            label={partnerName}
            overlay={partnerOverlay}
          />
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {cameraActive && (
        <>
          {vbSupported ? (
            <div className="flex gap-2 flex-wrap justify-center">
              <span className="text-xs text-warm-500 w-full text-center mb-0.5">
                Scene
              </span>
              {BACKGROUND_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onBackgroundChange(opt.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    background === opt.id
                      ? "bg-sage-500 text-white"
                      : "bg-warm-200 text-warm-700 hover:bg-warm-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-warm-500 text-center px-4">
              Virtual scenes work best on desktop — your camera shows normally on
              iPad.
            </p>
          )}
          <div className="flex gap-2 flex-wrap justify-center">
            <span className="text-xs text-warm-500 w-full text-center mb-0.5">
              Filter
            </span>
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
        </>
      )}
    </div>
  );
}
