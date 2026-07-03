"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { combinePhotos } from "@/lib/combine-photos";
import { captureFromCanvas } from "@/lib/segmentation";
import type { BackgroundId } from "@/lib/backgrounds";
import { useWebcam } from "@/hooks/useWebcam";
import { usePartnerVideo } from "@/hooks/usePartnerVideo";
import { useVirtualBackground } from "@/hooks/useVirtualBackground";
import type { Room, Session, PhotoFilter } from "@/types/database";
import { DualCameraView } from "@/components/DualCameraView";
import { ReadyToggle } from "@/components/ReadyToggle";
import { CountdownTimer } from "@/components/CountdownTimer";

interface PhotoboothSessionProps {
  session: Session;
  room: Room;
  userId: string;
  isMember1: boolean;
  partnerName: string;
  onComplete: () => void;
  onCancel: () => void;
}

type Phase = "camera" | "countdown" | "capturing" | "uploading" | "done" | "error";

export function PhotoboothSession({
  session,
  room,
  userId,
  isMember1,
  partnerName,
  onComplete,
  onCancel,
}: PhotoboothSessionProps) {
  const [filter, setFilter] = useState<PhotoFilter>("none");
  const [background, setBackground] = useState<BackgroundId>("cozy-booth");
  const [phase, setPhase] = useState<Phase>("camera");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const countdownStarted = useRef(false);
  const supabase = createClient();

  const {
    videoRef,
    canvasRef,
    state: webcamState,
    error: webcamError,
    start: startCamera,
    stop: stopCamera,
    capture,
    isActive,
    localStream,
  } = useWebcam({ filter });

  const { partnerVideoRef, status: partnerStatus } = usePartnerVideo({
    sessionId: session.id,
    userId,
    isInitiator: isMember1,
    localStream,
    enabled: isActive && (phase === "camera" || phase === "countdown"),
  });

  const localBg = useVirtualBackground({
    videoRef,
    backgroundId: background,
    enabled: isActive && (phase === "camera" || phase === "countdown"),
    mirrored: true,
  });

  const partnerBg = useVirtualBackground({
    videoRef: partnerVideoRef,
    backgroundId: background,
    enabled:
      partnerStatus === "connected" &&
      (phase === "camera" || phase === "countdown"),
    mirrored: false,
  });

  const isReady = isMember1
    ? session.ready_member_1
    : session.ready_member_2;
  const partnerReady = isMember1
    ? session.ready_member_2
    : session.ready_member_1;

  const bothReady = session.ready_member_1 && session.ready_member_2;

  useEffect(() => {
    if (
      bothReady &&
      isActive &&
      phase === "camera" &&
      !countdownStarted.current
    ) {
      countdownStarted.current = true;
      setPhase("countdown");
    }

    if (!bothReady && countdownStarted.current && phase === "countdown") {
      countdownStarted.current = false;
      setPhase("camera");
    }
  }, [bothReady, isActive, phase]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const toggleReady = async () => {
    const field = isMember1 ? "ready_member_1" : "ready_member_2";
    const newValue = !isReady;

    const updates: Record<string, boolean | string> = {
      [field]: newValue,
    };

    if (!newValue) {
      countdownStarted.current = false;
      if (phase === "countdown") setPhase("camera");
    }

    const bothWillBeReady =
      (isMember1 ? newValue : session.ready_member_1) &&
      (isMember1 ? session.ready_member_2 : newValue);

    if (bothWillBeReady) {
      updates.status = "both_ready";
    } else if (session.status === "both_ready") {
      updates.status = "waiting";
    }

    await supabase.from("sessions").update(updates).eq("id", session.id);
  };

  const uploadPhoto = useCallback(
    async (blob: Blob) => {
      const path = `${room.id}/${session.id}/photo_${isMember1 ? 1 : 2}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from("photos")
        .upload(path, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("photos").getPublicUrl(path);

      const photoField = isMember1 ? "photo_1_url" : "photo_2_url";
      await supabase
        .from("sessions")
        .update({ [photoField]: publicUrl })
        .eq("id", session.id);

      return publicUrl;
    },
    [room.id, session.id, isMember1, supabase]
  );

  const tryCombineAndFinish = useCallback(
    async (photo1Url: string, photo2Url: string) => {
      try {
        const combinedBlob = await combinePhotos(photo1Url, photo2Url);
        const combinedPath = `${room.id}/${session.id}/combined.jpg`;

        const { error: uploadErr } = await supabase.storage
          .from("photos")
          .upload(combinedPath, combinedBlob, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadErr) throw uploadErr;

        const {
          data: { publicUrl },
        } = supabase.storage.from("photos").getPublicUrl(combinedPath);

        await supabase
          .from("sessions")
          .update({
            combined_url: publicUrl,
            status: "captured",
            ready_member_1: false,
            ready_member_2: false,
          })
          .eq("id", session.id);
      } catch {
        await supabase
          .from("sessions")
          .update({ status: "captured" })
          .eq("id", session.id);
      }
    },
    [room.id, session.id, supabase]
  );

  const handleCountdownComplete = async () => {
    setPhase("capturing");

    let blob: Blob | null = null;
    if (
      localBg.active &&
      localBg.outputRef.current &&
      localBg.outputRef.current.width > 0
    ) {
      blob = captureFromCanvas(localBg.outputRef.current, filter);
    } else {
      blob = capture();
    }
    stopCamera();

    if (!blob) {
      setUploadError("Failed to capture photo. Please try again.");
      setPhase("error");
      return;
    }

    setPhase("uploading");

    try {
      await uploadPhoto(blob);

      const { data: freshSession } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", session.id)
        .single();

      if (!freshSession) throw new Error("Session not found");

      const photo1 = freshSession.photo_1_url;
      const photo2 = freshSession.photo_2_url;

      if (photo1 && photo2 && !freshSession.combined_url) {
        if (isMember1) {
          await tryCombineAndFinish(photo1, photo2);
        } else {
          let attempts = 0;
          while (attempts < 15) {
            await new Promise((r) => setTimeout(r, 1000));
            const { data: check } = await supabase
              .from("sessions")
              .select("combined_url, status")
              .eq("id", session.id)
              .single();
            if (check?.combined_url || check?.status === "captured") break;
            attempts++;
          }
        }
      } else if (!photo1 || !photo2) {
        await new Promise((r) => setTimeout(r, 500));
        const { data: retrySession } = await supabase
          .from("sessions")
          .select("*")
          .eq("id", session.id)
          .single();

        if (
          retrySession?.photo_1_url &&
          retrySession?.photo_2_url &&
          !retrySession.combined_url &&
          isMember1
        ) {
          await tryCombineAndFinish(
            retrySession.photo_1_url,
            retrySession.photo_2_url
          );
        }
      }

      setPhase("done");
      setTimeout(onComplete, 1500);
    } catch {
      setUploadError(
        "Upload failed — check your connection and try again."
      );
      setPhase("error");
    }
  };

  const handleCancel = async () => {
    stopCamera();
    await supabase
      .from("sessions")
      .update({
        status: "cancelled",
        ready_member_1: false,
        ready_member_2: false,
      })
      .eq("id", session.id);
    onCancel();
  };

  if (phase === "uploading" || phase === "capturing") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-12 h-12 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin" />
        <p className="text-warm-600">
          {phase === "capturing" ? "Smile! 📸" : "Saving your moment…"}
        </p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <span className="text-5xl">✨</span>
        <p className="text-lg font-semibold text-warm-800">
          Moment captured!
        </p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-coral-600 text-center">{uploadError}</p>
        <button onClick={handleCancel} className="btn-secondary">
          Back to room
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <DualCameraView
        localVideoRef={videoRef}
        partnerVideoRef={partnerVideoRef}
        localOutputRef={localBg.outputRef}
        partnerOutputRef={partnerBg.outputRef}
        useVirtualBackground={background !== "none"}
        backgroundLoading={localBg.modelLoading || partnerBg.modelLoading}
        canvasRef={canvasRef}
        state={webcamState}
        error={webcamError}
        filter={filter}
        background={background}
        partnerName={partnerName}
        partnerStatus={partnerStatus}
        onFilterChange={setFilter}
        onBackgroundChange={setBackground}
        onStart={startCamera}
        onRetry={startCamera}
      />

      {isActive && phase === "camera" && (
        <ReadyToggle
          isReady={isReady}
          partnerReady={partnerReady}
          partnerName={partnerName}
          onToggle={toggleReady}
          disabled={!isActive}
        />
      )}

      {phase === "camera" && (
        <button onClick={handleCancel} className="btn-ghost text-sm">
          Cancel session
        </button>
      )}

      {phase === "countdown" && (
        <CountdownTimer onComplete={handleCountdownComplete} />
      )}
    </div>
  );
}
