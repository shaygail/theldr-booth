"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { RoomView } from "@/components/RoomView";
import type { Room } from "@/types/database";

export default function RoomPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();
  const { user, loading: authLoading, displayName } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (authLoading || !user || !code) return;

    const loadRoom = async () => {
      const { data, error: fetchError } = await supabase
        .from("rooms")
        .select("*")
        .eq("invite_code", code)
        .single();

      if (fetchError || !data) {
        setError("Room not found.");
        setLoading(false);
        return;
      }

      const isMember =
        data.member_1_id === user.id || data.member_2_id === user.id;

      if (!isMember) {
        if (!data.member_2_id) {
          const { data: joined, error: joinError } = await supabase
            .from("rooms")
            .update({
              member_2_id: user.id,
              member_2_name: displayName || "Partner",
            })
            .eq("id", data.id)
            .select()
            .single();

          if (joinError || !joined) {
            setError("Could not join this room.");
            setLoading(false);
            return;
          }
          setRoom(joined);
        } else {
          setError("This room is full.");
          setLoading(false);
          return;
        }
      } else {
        setRoom(data);
      }

      setLoading(false);
    };

    loadRoom();
  }, [authLoading, user, code, displayName, supabase]);

  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room-page:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          setRoom(payload.new as Room);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room, supabase]);

  if (authLoading || loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-coral-600">{error}</p>
        <Link href="/" className="btn-secondary">
          Go home
        </Link>
      </main>
    );
  }

  if (!room) return null;

  return (
    <main className="flex-1 flex flex-col px-4 py-6 sm:py-10">
      <header className="mb-6 flex items-center justify-between max-w-lg mx-auto w-full">
        <Link
          href="/"
          className="text-sm text-warm-600 hover:text-warm-800 transition-colors"
        >
          ← Home
        </Link>
        <span className="font-serif text-lg text-warm-800">theldr booth</span>
        <div className="w-12" />
      </header>
      <RoomView room={room} />
    </main>
  );
}
