export type BackgroundId =
  | "none"
  | "cozy-booth"
  | "sunset"
  | "starry"
  | "cafe";

export const BACKGROUND_OPTIONS: { id: BackgroundId; label: string }[] = [
  { id: "none", label: "Original" },
  { id: "cozy-booth", label: "Cozy booth" },
  { id: "sunset", label: "Sunset" },
  { id: "starry", label: "Starry night" },
  { id: "cafe", label: "Café date" },
];

const cache = new Map<BackgroundId, HTMLCanvasElement>();

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  id: BackgroundId
) {
  switch (id) {
    case "cozy-booth": {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#f5ebe0");
      g.addColorStop(0.5, "#e8d5c4");
      g.addColorStop(1, "#d4a574");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(224, 122, 95, 0.15)";
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(w * (0.1 + i * 0.12), h * 0.15, 40, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(61, 64, 91, 0.08)";
      ctx.fillRect(0, h * 0.7, w, h * 0.3);
      break;
    }
    case "sunset": {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#6b4c6e");
      g.addColorStop(0.35, "#c96a52");
      g.addColorStop(0.65, "#e07a5f");
      g.addColorStop(1, "#f2cc8f");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255, 248, 243, 0.2)";
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.55, w * 0.25, h * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "starry": {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#1a1a2e");
      g.addColorStop(1, "#2d3142");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff8f3";
      for (let i = 0; i < 60; i++) {
        const x = (Math.sin(i * 127.1) * 0.5 + 0.5) * w;
        const y = (Math.cos(i * 311.7) * 0.5 + 0.5) * h * 0.7;
        const r = 1 + (i % 3);
        ctx.globalAlpha = 0.3 + (i % 5) * 0.14;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "cafe": {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#3d405b");
      g.addColorStop(0.5, "#5c4a3a");
      g.addColorStop(1, "#8b6914");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(242, 204, 143, 0.25)";
      ctx.fillRect(w * 0.1, h * 0.6, w * 0.8, h * 0.35);
      ctx.fillStyle = "rgba(255, 248, 243, 0.1)";
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(w * (0.15 + i * 0.17), h * 0.2, 8, h * 0.5);
      }
      break;
    }
    default:
      break;
  }
}

export function getBackgroundCanvas(id: BackgroundId): HTMLCanvasElement | null {
  if (id === "none") return null;
  if (!cache.has(id)) {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 800;
    const ctx = canvas.getContext("2d")!;
    drawBackground(ctx, canvas.width, canvas.height, id);
    cache.set(id, canvas);
  }
  return cache.get(id)!;
}

/** CSS gradient backdrops for iPad (no AI segmentation) */
export function getBackgroundCSS(id: BackgroundId): string | undefined {
  switch (id) {
    case "cozy-booth":
      return "linear-gradient(180deg, #f5ebe0 0%, #e8d5c4 50%, #d4a574 100%)";
    case "sunset":
      return "linear-gradient(180deg, #6b4c6e 0%, #c96a52 35%, #e07a5f 65%, #f2cc8f 100%)";
    case "starry":
      return "linear-gradient(180deg, #1a1a2e 0%, #2d3142 100%)";
    case "cafe":
      return "linear-gradient(135deg, #3d405b 0%, #5c4a3a 50%, #8b6914 100%)";
    default:
      return undefined;
  }
}

/** Compose a photo with scene backdrop (used on iPad at capture time) */
export function composeVideoOnBackground(
  video: HTMLVideoElement,
  backgroundId: BackgroundId,
  mirrored: boolean
): HTMLCanvasElement | null {
  const bg = getBackgroundCanvas(backgroundId);
  if (!bg) return null;

  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(bg, 0, 0, w, h);

  const pad = Math.round(w * 0.04);
  const vw = w - pad * 2;
  const vh = h - pad * 2;

  ctx.save();
  if (mirrored) {
    ctx.translate(pad + vw, pad);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, vw, vh);
  } else {
    ctx.drawImage(video, pad, pad, vw, vh);
  }
  ctx.restore();

  return canvas;
}
