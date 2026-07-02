import type { PhotoFilter } from "@/types/database";

export function applyFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filter: PhotoFilter
): void {
  if (filter === "none") return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    switch (filter) {
      case "bw": {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
        break;
      }
      case "warm": {
        data[i] = Math.min(255, r * 1.1 + 15);
        data[i + 1] = Math.min(255, g * 1.02 + 5);
        data[i + 2] = Math.max(0, b * 0.85);
        break;
      }
      case "vintage": {
        const sepiaR = 0.393 * r + 0.769 * g + 0.189 * b;
        const sepiaG = 0.349 * r + 0.686 * g + 0.168 * b;
        const sepiaB = 0.272 * r + 0.534 * g + 0.131 * b;
        data[i] = Math.min(255, sepiaR * 0.9 + 20);
        data[i + 1] = Math.min(255, sepiaG * 0.85 + 10);
        data[i + 2] = Math.min(255, sepiaB * 0.7);
        break;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export const FILTER_OPTIONS: { value: PhotoFilter; label: string }[] = [
  { value: "none", label: "Original" },
  { value: "bw", label: "B&W" },
  { value: "warm", label: "Warm" },
  { value: "vintage", label: "Vintage" },
];
