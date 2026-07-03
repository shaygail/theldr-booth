export async function downloadImage(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch image");

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function photoboothFilename(sessionDate: string): string {
  const date = new Date(sessionDate);
  const stamp = date.toISOString().slice(0, 10);
  return `theldrbooth-${stamp}.jpg`;
}
