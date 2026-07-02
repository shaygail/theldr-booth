"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

export function RoomJoin() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, displayName, setDisplayName } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !code.trim()) return;

    setLoading(true);
    setError(null);

    const inviteCode = code.trim().toUpperCase();

    const { data: room, error: fetchError } = await supabase
      .from("rooms")
      .select("*")
      .eq("invite_code", inviteCode)
      .single();

    if (fetchError || !room) {
      setError("Room not found. Double-check your code and try again.");
      setLoading(false);
      return;
    }

    if (room.member_1_id === user.id) {
      router.push(`/room/${inviteCode}`);
      return;
    }

    if (room.member_2_id && room.member_2_id !== user.id) {
      setError("This room is already full.");
      setLoading(false);
      return;
    }

    if (!room.member_2_id) {
      const { error: updateError } = await supabase
        .from("rooms")
        .update({
          member_2_id: user.id,
          member_2_name: displayName || "Partner",
        })
        .eq("id", room.id);

      if (updateError) {
        setError("Could not join room. Please try again.");
        setLoading(false);
        return;
      }
    }

    router.push(`/room/${inviteCode}`);
  };

  return (
    <div className="w-full max-w-sm">
      <label htmlFor="display-name" className="block text-sm font-medium text-warm-700 mb-1.5">
        Your name
      </label>
      <input
        id="display-name"
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Alex"
        className="input mb-4"
        maxLength={24}
      />

      <form onSubmit={handleJoin}>
        <label htmlFor="invite-code" className="block text-sm font-medium text-warm-700 mb-1.5">
          Enter invite code
        </label>
        <input
          id="invite-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          className="input text-center text-2xl tracking-[0.3em] font-semibold uppercase mb-4"
          maxLength={6}
          autoComplete="off"
        />

        {error && (
          <p className="text-coral-600 text-sm mb-4 text-center" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || code.length < 6 || !displayName.trim()}
          className="btn-primary w-full"
        >
          {loading ? "Joining…" : "Join room"}
        </button>
      </form>
    </div>
  );
}
