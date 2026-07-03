import type { Session } from "@/types/database";

export type SessionShot = { photo1Url: string; photo2Url: string };

export function normalizeUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean) as string[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

export function getSessionShots(session: Session): SessionShot[] {
  const urls1 = normalizeUrls(session.photo_1_urls);
  const urls2 = normalizeUrls(session.photo_2_urls);

  if (urls1.length > 0 && urls1.length === urls2.length) {
    return urls1.map((photo1Url, i) => ({
      photo1Url,
      photo2Url: urls2[i],
    }));
  }

  if (session.photo_1_url && session.photo_2_url) {
    return [{ photo1Url: session.photo_1_url, photo2Url: session.photo_2_url }];
  }

  return [];
}

export function canRegenerateSession(session: Session): boolean {
  return getSessionShots(session).length > 0;
}
