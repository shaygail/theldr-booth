export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** AI cutout backgrounds (body-pix) — desktop only */
export function supportsAISegmentation(): boolean {
  if (typeof window === "undefined") return false;
  return !isIOS();
}

/** @deprecated use supportsAISegmentation */
export function supportsVirtualBackground(): boolean {
  return supportsAISegmentation();
}
