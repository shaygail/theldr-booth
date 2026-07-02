"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@/types/database";

export function useSessions(roomId: string | null) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchSessions = useCallback(async () => {
    if (!roomId) return;

    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });

    if (data) {
      setSessions(data);
      const active = data.find(
        (s) => s.status === "waiting" || s.status === "both_ready"
      );
      setActiveSession(active ?? null);
    }
    setLoading(false);
  }, [roomId, supabase]);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    fetchSessions();

    const channel = supabase
      .channel(`sessions:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase, fetchSessions]);

  return { sessions, activeSession, loading, refetch: fetchSessions };
}
