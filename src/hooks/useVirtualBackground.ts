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
  const lockedRef = useRef(false);
  const renderingRef = useRef(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [supported] = useState(supportsVirtualBackground());

  const active = supported && enabled && backgroundId !== "none";

  useEffect(() => {
    if (!active) {
      lockedRef.current = false;
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
        if (!cancelled) setModelLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    let running = true;
    let lastFrame = 0;
    const fps = 6;

    const loop = async (timestamp: number) => {
      if (!running) return;
      requestAnimationFrame(loop);

      if (timestamp - lastFrame < 1000 / fps) return;
      if (renderingRef.current) return;

      const video = videoRef.current;
      const output = outputRef.current;
      if (!video || !output || video.readyState < 2) return;

      lastFrame = timestamp;
      renderingRef.current = true;

      try {
        const ok = await renderWithBackground(
          video,
          output,
          backgroundId,
          mirrored
        );
        if (ok && !lockedRef.current) {
          lockedRef.current = true;
          setHasFrame(true);
        }
      } catch {
        // Keep showing last good frame — never flash back to raw video
      } finally {
        renderingRef.current = false;
      }
    };

    const id = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(id);
      renderingRef.current = false;
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
