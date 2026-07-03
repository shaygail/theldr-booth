import type { PhotoFilter } from "@/types/database";
import { applyFilter } from "@/lib/filters";
import { supportsVirtualBackground } from "@/lib/device";
import type * as bodyPixType from "@tensorflow-models/body-pix";
import type { BackgroundId } from "@/lib/backgrounds";
import { getBackgroundCanvas } from "@/lib/backgrounds";

let netPromise: Promise<bodyPixType.BodyPix> | null = null;
let bodyPixModule: typeof bodyPixType | null = null;
let backendReady = false;

async function initBackend() {
  const tf = await import("@tensorflow/tfjs-core");
  await import("@tensorflow/tfjs-backend-webgl");

  const backends = ["webgl", "cpu"] as const;
  for (const backend of backends) {
    try {
      await tf.setBackend(backend);
      await tf.ready();
      backendReady = true;
      return;
    } catch {
      // try next backend
    }
  }
  throw new Error("No TensorFlow backend available");
}

async function getModel() {
  if (!supportsVirtualBackground()) {
    throw new Error("Virtual background not supported on this device");
  }
  if (!netPromise) {
    netPromise = (async () => {
      await initBackend();
      bodyPixModule = await import("@tensorflow-models/body-pix");
      return bodyPixModule.load({
        architecture: "MobileNetV1",
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2,
      });
    })();
  }
  return netPromise;
}

export async function preloadSegmentationModel() {
  if (!supportsVirtualBackground()) return false;
  await getModel();
  return true;
}

export async function renderWithBackground(
  video: HTMLVideoElement,
  output: HTMLCanvasElement,
  backgroundId: BackgroundId,
  mirrored: boolean
): Promise<boolean> {
  if (backgroundId === "none" || !supportsVirtualBackground()) return false;

  const bg = getBackgroundCanvas(backgroundId);
  if (!bg) return false;

  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h || video.readyState < 2) return false;

  const net = await getModel();
  if (!bodyPixModule || !backendReady) return false;

  output.width = w;
  output.height = h;

  const segmentation = await net.segmentPerson(video, {
    flipHorizontal: mirrored,
    internalResolution: "low",
    segmentationThreshold: 0.7,
  });

  const ctx = output.getContext("2d")!;
  ctx.drawImage(bg, 0, 0, w, h);

  const mask = bodyPixModule.toMask(segmentation);
  bodyPixModule.drawMask(output, video, mask, 1, 4, mirrored);

  return true;
}

export function captureFromCanvas(
  source: HTMLCanvasElement,
  filter: PhotoFilter = "none"
): Blob | null {
  const w = source.width;
  const h = source.height;
  if (!w || !h) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0, w, h);
  applyFilter(ctx, w, h, filter);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const byteString = atob(dataUrl.split(",")[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: "image/jpeg" });
}
