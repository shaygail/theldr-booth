"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type PartnerVideoStatus = "idle" | "connecting" | "connected" | "waiting";

type SignalMessage =
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
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    localStream.getVideoTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    let channel: RealtimeChannel;

    const sendSignal = (message: SignalMessage) => {
      channel?.send({
        type: "broadcast",
        event: "webrtc",
        payload: { ...message, from: userId },
      });
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
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        setStatus("waiting");
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

        try {
          if (payload.type === "offer" && !isInitiator) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(payload.sdp)
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal({ type: "answer", sdp: pc.localDescription!.toJSON() });
          } else if (payload.type === "answer" && isInitiator) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(payload.sdp)
            );
          } else if (payload.type === "ice" && payload.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        } catch {
          // ICE races are common — ignore non-fatal errors
        }
      }
    );

    channel.subscribe(async (subStatus) => {
      if (subStatus !== "SUBSCRIBED") return;

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ type: "offer", sdp: pc.localDescription!.toJSON() });
      } else {
        setStatus("waiting");
      }
    });

    return () => {
      pc.close();
      supabase.removeChannel(channel);
      if (partnerVideoRef.current) {
        partnerVideoRef.current.srcObject = null;
      }
    };
  }, [enabled, localStream, sessionId, isInitiator, userId, supabase]);

  return { partnerVideoRef, status };
}
