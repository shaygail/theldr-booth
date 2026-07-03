"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PhotoFilter } from "@/types/database";
import { applyFilter } from "@/lib/filters";

export type WebcamState =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "error";

interface UseWebcamOptions {
  filter?: PhotoFilter;
  mirrored?: boolean;
}

export function useWebcam(options: UseWebcamOptions = {}) {
  const { filter = "none", mirrored = true } = options;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<WebcamState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const start = useCallback(async () => {
    setState("requesting");
    setError(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported in this browser");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setLocalStream(stream);

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }

      setState("active");
    } catch (err) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setLocalStream(null);

      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera access was denied. Please allow camera permissions in your browser settings."
          : err instanceof DOMException && err.name === "NotFoundError"
            ? "No camera found on this device."
            : "Could not access your camera. Tap Open camera and allow permission when prompted.";

      setError(message);
      setState(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "denied"
          : "error"
      );
    }
  }, []);

  // Attach stream when video element mounts (ref may be null during first start)
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (state !== "active" || !video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [state]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLocalStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState("idle");
  }, []);

  const capture = useCallback((): Blob | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return null;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return null;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d")!;
    if (mirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);
    if (mirrored) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    applyFilter(ctx, width, height, filter);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const byteString = atob(dataUrl.split(",")[1]);
    const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }, [filter, mirrored]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    state,
    error,
    localStream,
    start,
    stop,
    capture,
    isActive: state === "active",
  };
}
