import type { PhotoboothLayout } from "@/types/database";

const PADDING = 20;
const HEADER_HEIGHT = 52;
const DATE_BAR = 44;
const GAP = 10;

export async function combinePhotobooth(
  layout: PhotoboothLayout,
  shots: Array<{ photo1Url: string; photo2Url: string }>,
  stripText?: string | null,
  date: Date = new Date()
): Promise<Blob> {
  await ensureFonts();

  const images = await Promise.all(
    shots.map(async (shot) => {
      const [img1, img2] = await Promise.all([
        loadImage(shot.photo1Url),
        loadImage(shot.photo2Url),
      ]);
      return { img1, img2 };
    })
  );

  const pairW = layout === "single" ? 720 : layout === "strip" ? 360 : 200;
  const pairH = layout === "single" ? 400 : layout === "strip" ? 220 : 280;
  const photosTop = PADDING + HEADER_HEIGHT;

  let canvasWidth: number;
  let canvasHeight: number;

  if (layout === "single") {
    canvasWidth = pairW + PADDING * 2;
    canvasHeight = photosTop + pairH + PADDING + DATE_BAR;
  } else if (layout === "strip") {
    canvasWidth = pairW + PADDING * 2;
    canvasHeight =
      photosTop +
      pairH * shots.length +
      GAP * (shots.length - 1) +
      PADDING +
      DATE_BAR;
  } else {
    canvasWidth =
      pairW * shots.length +
      GAP * (shots.length - 1) +
      PADDING * 2;
    canvasHeight = photosTop + pairH + PADDING + DATE_BAR;
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#FFF8F3";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  drawHeader(ctx, canvasWidth);

  images.forEach(({ img1, img2 }, index) => {
    if (layout === "single") {
      drawPair(ctx, img1, img2, PADDING, photosTop, pairW, pairH);
    } else if (layout === "strip") {
      const y = photosTop + index * (pairH + GAP);
      drawPair(ctx, img1, img2, PADDING, y, pairW, pairH);
    } else {
      const x = PADDING + index * (pairW + GAP);
      drawPair(ctx, img1, img2, x, photosTop, pairW, pairH);
    }
  });

  drawStripText(
    ctx,
    canvasWidth,
    canvasHeight,
    stripText?.trim() ||
      date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
  );
  drawBorder(ctx, canvasWidth, canvasHeight);

  return canvasToBlob(canvas);
}

/** @deprecated single-shot side-by-side; use combinePhotobooth */
export async function combinePhotos(
  photo1Url: string,
  photo2Url: string,
  date: Date = new Date()
): Promise<Blob> {
  return combinePhotobooth(
    "single",
    [{ photo1Url, photo2Url }],
    null,
    date
  );
}

function drawHeader(ctx: CanvasRenderingContext2D, canvasWidth: number) {
  const centerY = PADDING + HEADER_HEIGHT / 2 - 2;
  const fontSize = 28;

  ctx.textBaseline = "middle";
  ctx.font = `600 ${fontSize}px "Fraunces", Georgia, serif`;

  const prefix = "theldr";
  const suffix = " booth";
  const prefixWidth = ctx.measureText(prefix).width;
  const fullWidth = ctx.measureText(prefix + suffix).width;
  const startX = (canvasWidth - fullWidth) / 2;

  ctx.textAlign = "left";
  ctx.fillStyle = "#E07A5F";
  ctx.fillText(prefix, startX, centerY);

  ctx.fillStyle = "#3D405B";
  ctx.fillText(suffix, startX + prefixWidth, centerY);

  const lineY = PADDING + HEADER_HEIGHT - 6;
  ctx.strokeStyle = "#F2CC8F";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, lineY);
  ctx.lineTo(canvasWidth - PADDING, lineY);
  ctx.stroke();
}

function drawPair(
  ctx: CanvasRenderingContext2D,
  img1: HTMLImageElement,
  img2: HTMLImageElement,
  x: number,
  y: number,
  pairW: number,
  pairH: number
) {
  const halfW = pairW / 2;
  drawPhoto(ctx, img1, x, y, halfW, pairH, { roundLeft: true, roundRight: false });
  drawPhoto(ctx, img2, x + halfW, y, halfW, pairH, {
    roundLeft: false,
    roundRight: true,
  });
}

function drawStripText(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  text: string
) {
  ctx.fillStyle = "#3D405B";
  ctx.font = '500 14px "Nunito", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxWidth = canvasWidth - 32;
  let displayText = text;
  if (ctx.measureText(displayText).width > maxWidth) {
    while (
      displayText.length > 0 &&
      ctx.measureText(`${displayText}…`).width > maxWidth
    ) {
      displayText = displayText.slice(0, -1);
    }
    displayText = `${displayText}…`;
  }

  ctx.fillText(displayText, canvasWidth / 2, canvasHeight - DATE_BAR / 2);
}

function drawBorder(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.strokeStyle = "#F2CC8F";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvasWidth - 2, canvasHeight - 2);
}

function drawPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  corners: { roundLeft: boolean; roundRight: boolean }
) {
  const imgAspect = img.width / img.height;
  const boxAspect = width / height;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imgAspect > boxAspect) {
    sw = img.height * boxAspect;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxAspect;
    sy = (img.height - sh) / 2;
  }

  ctx.save();
  roundPhotoRect(ctx, x, y, width, height, 8, corners);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
  ctx.restore();
}

function roundPhotoRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  { roundLeft, roundRight }: { roundLeft: boolean; roundRight: boolean }
) {
  const tl = roundLeft ? r : 0;
  const tr = roundRight ? r : 0;
  const br = roundRight ? r : 0;
  const bl = roundLeft ? r : 0;

  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  if (tr) ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  else ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - br);
  if (br) ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  else ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + bl, y + h);
  if (bl) ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  else ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + tl);
  if (tl) ctx.quadraticCurveTo(x, y, x + tl, y);
  else ctx.lineTo(x, y);
  ctx.closePath();
}

async function ensureFonts(): Promise<void> {
  if (typeof document === "undefined") return;
  await Promise.all([
    document.fonts.load('600 28px "Fraunces"'),
    document.fonts.load('500 14px "Nunito"'),
  ]);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create combined image"));
      },
      "image/jpeg",
      0.92
    );
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
