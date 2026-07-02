export type SessionStatus = "waiting" | "both_ready" | "captured" | "cancelled";

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
  combined_url: string | null;
  caption: string | null;
  favorited: boolean;
  initiated_by: string | null;
  created_at: string;
}

export type PhotoFilter = "none" | "bw" | "warm" | "vintage";
