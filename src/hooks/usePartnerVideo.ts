"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type PartnerVideoStatus = "idle" | "connecting" | "connected" | "waiting";

type SignalMessage =
  | { type: "peer-ready" }
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit };

interface UsePartnerVideoOptions {
  sessionId: string;
  userId: string;
  isInitiator: boolean;
  localStream: MediaStream | null;
  enabled: boolean;
}

export function usePartnerVideo({
  sessionId,
  userId,
  isInitiator,
  localStream,
  enabled,
}: UsePartnerVideoOptions) {
  const partnerVideoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<PartnerVideoStatus>("idle");
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!enabled || !localStream || !sessionId) {
      setStatus("idle");
      return;
    }

    setStatus("connecting");

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    localStream.getVideoTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    const pendingIce: RTCIceCandidateInit[] = [];
    let remoteDescSet = false;
    let partnerIsReady = false;
    let channel: RealtimeChannel;
    let heartbeat: ReturnType<typeof setInterval>;

    const flushIce = async () => {
      while (pendingIce.length > 0 && remoteDescSet) {
        const candidate = pendingIce.shift()!;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // Ignore stale candidates
        }
      }
    };

    const sendSignal = (message: SignalMessage) => {
      channel?.send({
        type: "broadcast",
        event: "webrtc",
        payload: { ...message, from: userId },
      });
    };

    const sendPeerReady = () => {
      sendSignal({ type: "peer-ready" });
    };

    const createAndSendOffer = async () => {
      if (!isInitiator) return;
      try {
        const offer = await pc.createOffer({ iceRestart: remoteDescSet });
        await pc.setLocalDescription(offer);
        sendSignal({ type: "offer", sdp: pc.localDescription!.toJSON() });
      } catch {
        // PC may be closing
      }
    };

    const handleOffer = async (sdp: RTCSessionDescriptionInit) => {
      if (isInitiator) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        remoteDescSet = true;
        await flushIce();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ type: "answer", sdp: pc.localDescription!.toJSON() });
      } catch {
        // Renegotiation race — partner will retry
      }
    };

    const handleAnswer = async (sdp: RTCSessionDescriptionInit) => {
      if (!isInitiator) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        remoteDescSet = true;
        await flushIce();
      } catch {
        // Partner may retry
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (partnerVideoRef.current && stream) {
        partnerVideoRef.current.srcObject = stream;
        partnerVideoRef.current.play().catch(() => {});
      }
      setStatus("connected");
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ type: "ice", candidate: event.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setStatus("connected");
      } else if (pc.connectionState === "connecting") {
        setStatus("connecting");
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        setStatus("waiting");
        remoteDescSet = false;
        pendingIce.length = 0;
        if (isInitiator && partnerIsReady) {
          void createAndSendOffer();
        }
      }
    };

    channel = supabase.channel(`webrtc:${sessionId}`, {
      config: { broadcast: { ack: false, self: false } },
    });

    channel.on(
      "broadcast",
      { event: "webrtc" },
      async ({ payload }: { payload: SignalMessage & { from: string } }) => {
        if (payload.from === userId) return;

        if (payload.type === "peer-ready") {
          partnerIsReady = true;
          if (isInitiator) {
            await createAndSendOffer();
          } else {
            setStatus("connecting");
          }
          return;
        }

        if (payload.type === "offer") {
          await handleOffer(payload.sdp);
          return;
        }

        if (payload.type === "answer") {
          await handleAnswer(payload.sdp);
          return;
        }

        if (payload.type === "ice" && payload.candidate) {
          if (!remoteDescSet) {
            pendingIce.push(payload.candidate);
          } else {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch {
              // Ignore stale candidates
            }
          }
        }
      }
    );

    channel.subscribe(async (subStatus) => {
      if (subStatus !== "SUBSCRIBED") return;

      sendPeerReady();

      if (!isInitiator) {
        setStatus("waiting");
      }

      heartbeat = setInterval(() => {
        if (pc.connectionState === "connected") return;
        sendPeerReady();
        if (isInitiator && partnerIsReady) {
          void createAndSendOffer();
        }
      }, 2500);
    });

    return () => {
      clearInterval(heartbeat);
      pc.close();
      supabase.removeChannel(channel);
      if (partnerVideoRef.current) {
        partnerVideoRef.current.srcObject = null;
      }
    };
  }, [enabled, localStream, sessionId, isInitiator, userId, supabase]);

  return { partnerVideoRef, status };
}
