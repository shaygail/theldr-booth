export function formatStripDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function defaultStripText(date: Date = new Date()): string {
  return formatStripDate(date);
}

export function resolveStripText(
  stripText: string | null | undefined,
  sessionDate: string
): string {
  const trimmed = stripText?.trim();
  if (trimmed) return trimmed;
  return formatStripDate(new Date(sessionDate));
}
