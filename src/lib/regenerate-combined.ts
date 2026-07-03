import type { SupabaseClient } from "@supabase/supabase-js";
import { combinePhotobooth } from "@/lib/combine-photos";
import { resolveStripText } from "@/lib/strip-text";
import { getSessionShots } from "@/lib/session-shots";
import type { Session } from "@/types/database";

export async function regenerateCombined(
  session: Session,
  stripText: string,
  supabase: SupabaseClient
): Promise<string> {
  const shots = getSessionShots(session);

  if (shots.length === 0) {
    throw new Error(
      "Original photos are not available for this session. Take a new photobooth session to edit the strip text."
    );
  }

  const layout = session.layout ?? "single";
  const text = resolveStripText(stripText, session.created_at);
  const combinedBlob = await combinePhotobooth(layout, shots, text);
  const combinedPath = `${session.room_id}/${session.id}/combined.jpg`;

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

  const { error: updateErr } = await supabase
    .from("sessions")
    .update({
      combined_url: publicUrl,
      strip_text: text,
    })
    .eq("id", session.id);

  if (updateErr) {
    if (updateErr.message.includes("strip_text")) {
      const { error: fallbackErr } = await supabase
        .from("sessions")
        .update({ combined_url: publicUrl })
        .eq("id", session.id);
      if (fallbackErr) throw fallbackErr;
    } else {
      throw updateErr;
    }
  }

  return publicUrl;
}
