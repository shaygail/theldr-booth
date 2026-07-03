"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { combinePhotobooth } from "@/lib/combine-photos";
import { resolveStripText, defaultStripText } from "@/lib/strip-text";
import { normalizeUrls } from "@/lib/session-shots";
import { useWebcam } from "@/hooks/useWebcam";
import { usePartnerVideo } from "@/hooks/usePartnerVideo";
import type { Room, Session, PhotoFilter } from "@/types/database";
import { photosPerSession } from "@/types/database";
import { DualCameraView } from "@/components/DualCameraView";
import { ReadyToggle } from "@/components/ReadyToggle";
import { CountdownTimer } from "@/components/CountdownTimer";
import { layoutLabel } from "@/components/LayoutPicker";
import { StripTextEditor } from "@/components/StripTextEditor";

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
    photos1: normalizeUrls(session.photo_1_urls),
    photos2: normalizeUrls(session.photo_2_urls),
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
  const [multiShotActive, setMultiShotActive] = useState(false);
  const [localStripText, setLocalStripText] = useState(() =>
    resolveStripText(session.strip_text, session.created_at)
  );
  const countdownStarted = useRef(false);
  const combining = useRef(false);
  const countdownScheduledForRef = useRef(-1);
  const capturingShotIndexRef = useRef(0);
  const supabase = createClient();

  const layout = session.layout ?? "strip";
  const totalPhotos = photosPerSession(layout);
  const isInitiator = session.initiated_by === userId;
  const stripTextDisplay = resolveStripText(
    session.strip_text ?? localStripText,
    session.created_at
  );
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

  const cameraPhases =
    phase === "camera" ||
    phase === "countdown" ||
    phase === "capturing" ||
    phase === "uploading" ||
    phase === "between";

  const { partnerVideoRef, status: partnerStatus } = usePartnerVideo({
    sessionId: session.id,
    userId,
    isInitiator: isMember1,
    localStream,
    enabled: isActive && cameraPhases,
  });

  const isReady = isMember1
    ? session.ready_member_1
    : session.ready_member_2;
  const partnerReady = isMember1
    ? session.ready_member_2
    : session.ready_member_1;
  const bothReady = session.ready_member_1 && session.ready_member_2;

  useEffect(() => {
    setLocalStripText(resolveStripText(session.strip_text, session.created_at));
  }, [session.strip_text, session.created_at]);

  const persistStripText = useCallback(
    async (text: string) => {
      const trimmed = text.trim() || defaultStripText();
      await supabase
        .from("sessions")
        .update({ strip_text: trimmed })
        .eq("id", session.id);
    },
    [session.id, supabase]
  );

  const tryCombineAndFinish = useCallback(
    async (urls1: string[], urls2: string[]) => {
      if (combining.current) return;
      combining.current = true;

      try {
        const shots = urls1.map((photo1Url, i) => ({
          photo1Url,
          photo2Url: urls2[i],
        }));

        const text = resolveStripText(
          session.strip_text ?? localStripText,
          session.created_at
        );
        const combinedBlob = await combinePhotobooth(layout, shots, text);
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
            strip_text: text,
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
    [layout, room.id, session.id, session.strip_text, session.created_at, localStripText, supabase]
  );

  const startCountdown = useCallback((shotIndex: number) => {
    capturingShotIndexRef.current = shotIndex;
    countdownScheduledForRef.current = shotIndex;
    countdownStarted.current = true;
    setPhase("countdown");
  }, []);

  useEffect(() => {
    if (photos1.length !== photos2.length) return;

    const done = photos1.length;
    if (done === 0 || done <= session.shot_index) return;
    if (done > totalPhotos) return;

    supabase
      .from("sessions")
      .update({ shot_index: done })
      .eq("id", session.id);

    if (done === totalPhotos && isMember1 && !session.combined_url) {
      tryCombineAndFinish(photos1, photos2);
    }
  }, [
    photos1,
    photos2,
    session.shot_index,
    session.combined_url,
    isMember1,
    supabase,
    tryCombineAndFinish,
    totalPhotos,
  ]);

  useEffect(() => {
    if (
      bothReady &&
      isActive &&
      phase === "camera" &&
      !countdownStarted.current &&
      !multiShotActive
    ) {
      startCountdown(completedShots);
    }

    if (!bothReady && countdownStarted.current && phase === "countdown") {
      countdownStarted.current = false;
      setPhase("camera");
    }
  }, [
    bothReady,
    isActive,
    phase,
    multiShotActive,
    completedShots,
    startCountdown,
  ]);

  useEffect(() => {
    if (!multiShotActive) return;
    if (!isActive) return;
    if (phase !== "camera") return;
    if (countdownStarted.current) return;
    if (completedShots >= totalPhotos) return;
    if (photos1.length !== photos2.length) return;
    if (countdownScheduledForRef.current >= completedShots) return;

    const timer = setTimeout(() => {
      if (countdownScheduledForRef.current >= completedShots) return;
      countdownScheduledForRef.current = completedShots;
      startCountdown(completedShots);
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    multiShotActive,
    isActive,
    phase,
    completedShots,
    photos1.length,
    photos2.length,
    startCountdown,
    totalPhotos,
  ]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const captureWhenReady = useCallback(async (): Promise<Blob | null> => {
    for (let attempt = 0; attempt < 15; attempt++) {
      const blob = capture();
      if (blob) return blob;
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  }, [capture]);

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

      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: fresh } = await supabase
          .from("sessions")
          .select("photo_1_urls, photo_2_urls")
          .eq("id", session.id)
          .single();

        const current = normalizeUrls(
          isMember1 ? fresh?.photo_1_urls : fresh?.photo_2_urls
        );

        if (current.length > shotIndex) {
          return current[shotIndex];
        }

        if (current.length < shotIndex) {
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }

        const updated = [...current, publicUrl];
        const { error } = await supabase
          .from("sessions")
          .update({ [urlField]: updated })
          .eq("id", session.id);

        if (!error) return publicUrl;
        await new Promise((r) => setTimeout(r, 300));
      }

      throw new Error("Failed to save photo URL");
    },
    [room.id, session.id, isMember1, supabase]
  );

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

  const handleCountdownComplete = async () => {
    const shotIndex = capturingShotIndexRef.current;
    setPhase("capturing");

    const blob = await captureWhenReady();

    if (!blob) {
      stopCamera();
      setUploadError(
        `Failed to capture photo ${shotIndex + 1}. Please try again.`
      );
      setPhase("error");
      return;
    }

    setPhase("uploading");

    try {
      await uploadPhoto(blob, shotIndex);

      const moreShots = shotIndex + 1 < totalPhotos;

      if (moreShots) {
        setMultiShotActive(true);
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
        `Upload failed for photo ${shotIndex + 1} — check your connection and try again.`
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

  const overlayMessage =
    phase === "capturing"
      ? "Smile! 📸"
      : phase === "uploading"
        ? `Saving photo ${capturingShotIndexRef.current + 1} of ${totalPhotos}…`
        : phase === "between"
          ? `Nice! ${betweenShot} of ${totalPhotos} — get ready…`
          : null;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-coral-500">
          {layoutLabel(layout)}
        </p>
        <p className="text-sm text-warm-600 mt-0.5">
          Photo {Math.max(session.shot_index, completedShots) + 1} of{" "}
          {totalPhotos}
          {completedShots > 0 && ` · ${completedShots} saved`}
        </p>
        {stripTextDisplay && (
          <p className="text-xs text-warm-500 mt-1 italic truncate max-w-xs mx-auto">
            &ldquo;{stripTextDisplay}&rdquo;
          </p>
        )}
      </div>

      {phase === "camera" && isInitiator && !multiShotActive && (
        <StripTextEditor
          compact
          value={localStripText}
          onChange={setLocalStripText}
          onCommit={persistStripText}
        />
      )}

      <div className="relative w-full">
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

        {phase === "countdown" && (
          <CountdownTimer onComplete={handleCountdownComplete} />
        )}

        {overlayMessage && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-warm-900/50 backdrop-blur-sm">
            {phase === "uploading" || phase === "capturing" ? (
              <div className="w-12 h-12 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin mb-3" />
            ) : (
              <span className="text-4xl mb-2">✨</span>
            )}
            <p className="text-cream font-medium text-center px-4">
              {overlayMessage}
            </p>
          </div>
        )}
      </div>

      {isActive && phase === "camera" && !multiShotActive && (
        <ReadyToggle
          isReady={isReady}
          partnerReady={partnerReady}
          partnerName={partnerName}
          onToggle={toggleReady}
          disabled={!isActive}
        />
      )}

      {isActive && phase === "camera" && multiShotActive && (
        <p className="text-sm text-warm-600 text-center animate-pulse">
          {photos1.length !== photos2.length
            ? `Waiting for ${partnerName}…`
            : "Next photo starting soon…"}
        </p>
      )}

      {phase === "camera" && (
        <button onClick={handleCancel} className="btn-ghost text-sm">
          Cancel session
        </button>
      )}
    </div>
  );
}
