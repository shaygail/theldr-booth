import type { SupabaseClient } from "@supabase/supabase-js";
import { combinePhotobooth } from "@/lib/combine-photos";
import { resolveStripText } from "@/lib/strip-text";
import type { Session } from "@/types/database";

function normalizeUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  return [];
}

export async function regenerateCombined(
  session: Session,
  stripText: string,
  supabase: SupabaseClient
): Promise<string> {
  const urls1 = normalizeUrls(session.photo_1_urls);
  const urls2 = normalizeUrls(session.photo_2_urls);

  if (urls1.length === 0 || urls1.length !== urls2.length) {
    throw new Error("Missing photos for this session");
  }

  const layout = session.layout ?? "single";
  const shots = urls1.map((photo1Url, i) => ({
    photo1Url,
    photo2Url: urls2[i],
  }));

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

  if (updateErr) throw updateErr;

  return publicUrl;
}
