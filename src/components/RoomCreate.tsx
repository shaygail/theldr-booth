"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/invite-code";
import { useAuth } from "@/components/AuthProvider";

export function RoomCreate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, displayName, setDisplayName } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const handleCreate = async () => {
    if (!user || !displayName.trim()) return;

    setLoading(true);
    setError(null);

    let inviteCode = generateInviteCode();
    let attempts = 0;

    while (attempts < 5) {
      const { data, error: insertError } = await supabase
        .from("rooms")
        .insert({
          invite_code: inviteCode,
          member_1_id: user.id,
          member_1_name: displayName.trim(),
        })
        .select()
        .single();

      if (!insertError && data) {
        router.push(`/room/${inviteCode}`);
        return;
      }

      if (insertError?.code === "23505") {
        inviteCode = generateInviteCode();
        attempts++;
        continue;
      }

      setError("Could not create room. Please try again.");
      setLoading(false);
      return;
    }

    setError("Could not create room. Please try again.");
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm">
      <label htmlFor="create-name" className="block text-sm font-medium text-warm-700 mb-1.5">
        Your name
      </label>
      <input
        id="create-name"
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Alex"
        className="input mb-4"
        maxLength={24}
      />

      {error && (
        <p className="text-coral-600 text-sm mb-4 text-center" role="alert">
          {error}
        </p>
      )}

      <button
        onClick={handleCreate}
        disabled={loading || !displayName.trim()}
        className="btn-primary w-full"
      >
        {loading ? "Creating…" : "Create a room"}
      </button>
    </div>
  );
}
