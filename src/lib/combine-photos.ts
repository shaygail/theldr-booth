export async function combinePhotos(
  photo1Url: string,
  photo2Url: string,
  date: Date = new Date()
): Promise<Blob> {
  const [img1, img2] = await Promise.all([
    loadImage(photo1Url),
    loadImage(photo2Url),
  ]);

  const photoWidth = 400;
  const photoHeight = 500;
  const padding = 24;
  const dividerWidth = 3;
  const dateBarHeight = 48;
  const canvasWidth = photoWidth * 2 + dividerWidth + padding * 2;
  const canvasHeight = photoHeight + padding * 2 + dateBarHeight;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d")!;

  // Warm cream background
  ctx.fillStyle = "#FFF8F3";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Photo 1 (left)
  drawPhoto(ctx, img1, padding, padding, photoWidth, photoHeight);

  // Divider
  const dividerX = padding + photoWidth;
  ctx.fillStyle = "#E07A5F";
  ctx.globalAlpha = 0.4;
  ctx.fillRect(dividerX, padding, dividerWidth, photoHeight);
  ctx.globalAlpha = 1;

  // Photo 2 (right)
  drawPhoto(
    ctx,
    img2,
    padding + photoWidth + dividerWidth,
    padding,
    photoWidth,
    photoHeight
  );

  // Date stamp
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  ctx.fillStyle = "#3D405B";
  ctx.font = "500 16px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(dateStr, canvasWidth / 2, canvasHeight - dateBarHeight / 2 + 6);

  // Subtle border
  ctx.strokeStyle = "#F2CC8F";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvasWidth - 2, canvasHeight - 2);

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

function drawPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
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
  roundRect(ctx, x, y, width, height, 12);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
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
