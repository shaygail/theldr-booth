"use client";

import { useEffect, useRef, useState } from "react";
import type { BackgroundId } from "@/lib/backgrounds";
import { supportsVirtualBackground } from "@/lib/device";
import {
  preloadSegmentationModel,
  renderWithBackground,
} from "@/lib/segmentation";

interface UseVirtualBackgroundOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  backgroundId: BackgroundId;
  enabled: boolean;
  mirrored?: boolean;
}

export function useVirtualBackground({
  videoRef,
  backgroundId,
  enabled,
  mirrored = false,
}: UseVirtualBackgroundOptions) {
  const outputRef = useRef<HTMLCanvasElement>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [supported] = useState(supportsVirtualBackground());

  const active =
    supported && enabled && backgroundId !== "none";

  useEffect(() => {
    if (!active) {
      setHasFrame(false);
      return;
    }

    let cancelled = false;
    setModelLoading(true);
    preloadSegmentationModel()
      .then(() => {
        if (!cancelled) setModelLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setModelLoading(false);
          setHasFrame(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    let running = true;
    let lastFrame = 0;
    const fps = 8;

    const loop = async (timestamp: number) => {
      if (!running) return;

      if (timestamp - lastFrame >= 1000 / fps) {
        lastFrame = timestamp;
        const video = videoRef.current;
        const output = outputRef.current;
        if (video && output && video.readyState >= 2) {
          try {
            const ok = await renderWithBackground(
              video,
              output,
              backgroundId,
              mirrored
            );
            if (ok) setHasFrame(true);
          } catch {
            setHasFrame(false);
          }
        }
      }

      requestAnimationFrame(loop);
    };

    const id = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(id);
      setHasFrame(false);
    };
  }, [active, backgroundId, mirrored, videoRef]);

  return {
    outputRef,
    active,
    supported,
    hasFrame,
    modelLoading,
    showProcessed: active && hasFrame,
  };
}
