"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { combinePhotobooth } from "@/lib/combine-photos";
import { useWebcam } from "@/hooks/useWebcam";
import { usePartnerVideo } from "@/hooks/usePartnerVideo";
import type { Room, Session, PhotoFilter } from "@/types/database";
import { PHOTOS_PER_SESSION } from "@/types/database";
import { DualCameraView } from "@/components/DualCameraView";
import { ReadyToggle } from "@/components/ReadyToggle";
import { CountdownTimer } from "@/components/CountdownTimer";
import { layoutLabel } from "@/components/LayoutPicker";

interface PhotoboothSessionProps {
  session: Session;
  room: Room;
  userId: string;
  isMember1: boolean;
  partnerName: string;
  onComplete: () => void;
  onCancel: () => void;
}

type Phase =
  | "camera"
  | "countdown"
  | "capturing"
  | "uploading"
  | "between"
  | "done"
  | "error";

function photoUrls(session: Session) {
  return {
    photos1: session.photo_1_urls ?? [],
    photos2: session.photo_2_urls ?? [],
  };
}

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
  const [phase, setPhase] = useState<Phase>("camera");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [betweenShot, setBetweenShot] = useState(0);
  const countdownStarted = useRef(false);
  const multiShotActive = useRef(false);
  const combining = useRef(false);
  const supabase = createClient();

  const layout = session.layout ?? "strip";
  const { photos1, photos2 } = photoUrls(session);
  const completedShots = Math.min(photos1.length, photos2.length);

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
    enabled:
      isActive &&
      (phase === "camera" || phase === "countdown" || phase === "between"),
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
      !countdownStarted.current &&
      !multiShotActive.current
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
    if (
      !multiShotActive.current ||
      session.shot_index <= 0 ||
      session.shot_index >= PHOTOS_PER_SESSION ||
      !isActive ||
      phase !== "camera" ||
      countdownStarted.current
    ) {
      return;
    }

    const timer = setTimeout(() => {
      countdownStarted.current = true;
      setPhase("countdown");
    }, 2000);

    return () => clearTimeout(timer);
  }, [session.shot_index, isActive, phase]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const tryCombineAndFinish = useCallback(
    async (urls1: string[], urls2: string[]) => {
      if (combining.current) return;
      combining.current = true;

      try {
        const shots = urls1.map((photo1Url, i) => ({
          photo1Url,
          photo2Url: urls2[i],
        }));

        const combinedBlob = await combinePhotobooth(layout, shots);
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
    [layout, room.id, session.id, supabase]
  );

  useEffect(() => {
    if (!isMember1 || combining.current || session.combined_url) return;

    const { photos1: p1, photos2: p2 } = photoUrls(session);
    if (p1.length !== p2.length || p1.length === 0) return;

    const done = p1.length;

    if (done < PHOTOS_PER_SESSION && done > session.shot_index) {
      supabase
        .from("sessions")
        .update({ shot_index: done })
        .eq("id", session.id);
    } else if (done === PHOTOS_PER_SESSION) {
      tryCombineAndFinish(p1, p2);
    }
  }, [
    session.photo_1_urls,
    session.photo_2_urls,
    session.shot_index,
    session.combined_url,
    isMember1,
    session,
    supabase,
    tryCombineAndFinish,
  ]);

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
    async (blob: Blob, shotIndex: number) => {
      const path = `${room.id}/${session.id}/photo_${isMember1 ? 1 : 2}_${shotIndex}.jpg`;

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

      const urlField = isMember1 ? "photo_1_urls" : "photo_2_urls";
      const current = isMember1 ? photos1 : photos2;
      const updated = [...current, publicUrl];

      await supabase
        .from("sessions")
        .update({ [urlField]: updated })
        .eq("id", session.id);

      return publicUrl;
    },
    [room.id, session.id, isMember1, photos1, photos2, supabase]
  );

  const handleCountdownComplete = async () => {
    setPhase("capturing");

    const blob = capture();

    if (!blob) {
      stopCamera();
      setUploadError("Failed to capture photo. Please try again.");
      setPhase("error");
      return;
    }

    setPhase("uploading");

    try {
      const shotIndex = session.shot_index;
      await uploadPhoto(blob, shotIndex);

      const moreShots = shotIndex + 1 < PHOTOS_PER_SESSION;

      if (moreShots) {
        multiShotActive.current = true;
        countdownStarted.current = false;
        setBetweenShot(shotIndex + 1);
        setPhase("between");

        setTimeout(() => {
          setPhase("camera");
        }, 2000);
      } else {
        stopCamera();

        if (!isMember1) {
          let attempts = 0;
          while (attempts < 20) {
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

        setPhase("done");
        setTimeout(onComplete, 1500);
      }
    } catch {
      stopCamera();
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
          {phase === "capturing"
            ? "Smile! 📸"
            : `Saving photo ${session.shot_index + 1} of ${PHOTOS_PER_SESSION}…`}
        </p>
      </div>
    );
  }

  if (phase === "between") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <span className="text-4xl">✨</span>
        <p className="text-lg font-semibold text-warm-800">
          Nice! {betweenShot} of {PHOTOS_PER_SESSION}
        </p>
        <p className="text-sm text-warm-600">Get ready for the next one…</p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <span className="text-5xl">✨</span>
        <p className="text-lg font-semibold text-warm-800">
          {layoutLabel(layout)} captured!
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
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-coral-500">
          {layoutLabel(layout)}
        </p>
        <p className="text-sm text-warm-600 mt-0.5">
          Photo {session.shot_index + 1} of {PHOTOS_PER_SESSION}
          {completedShots > 0 && ` · ${completedShots} saved`}
        </p>
      </div>

      <DualCameraView
        localVideoRef={videoRef}
        partnerVideoRef={partnerVideoRef}
        canvasRef={canvasRef}
        state={webcamState}
        error={webcamError}
        filter={filter}
        partnerName={partnerName}
        partnerStatus={partnerStatus}
        onFilterChange={setFilter}
        onStart={startCamera}
        onRetry={startCamera}
      />

      {isActive && phase === "camera" && !multiShotActive.current && (
        <ReadyToggle
          isReady={isReady}
          partnerReady={partnerReady}
          partnerName={partnerName}
          onToggle={toggleReady}
          disabled={!isActive}
        />
      )}

      {isActive && phase === "camera" && multiShotActive.current && (
        <p className="text-sm text-warm-600 text-center animate-pulse">
          Next photo starting soon…
        </p>
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
