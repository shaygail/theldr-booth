export type SessionStatus = "waiting" | "both_ready" | "captured" | "cancelled";

export type PhotoboothLayout = "single" | "strip" | "columns";

export function photosPerSession(layout: PhotoboothLayout): number {
  return layout === "single" ? 1 : 4;
}

export interface Room {
  id: string;
  invite_code: string;
  member_1_id: string | null;
  member_2_id: string | null;
  member_1_name: string | null;
  member_2_name: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  room_id: string;
  status: SessionStatus;
  ready_member_1: boolean;
  ready_member_2: boolean;
  photo_1_url: string | null;
  photo_2_url: string | null;
  photo_1_urls: string[];
  photo_2_urls: string[];
  layout: PhotoboothLayout;
  shot_index: number;
  combined_url: string | null;
  caption: string | null;
  favorited: boolean;
  initiated_by: string | null;
  created_at: string;
}

export type PhotoFilter = "none" | "bw" | "warm" | "vintage";
