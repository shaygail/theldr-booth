export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function supportsVirtualBackground(): boolean {
  if (typeof window === "undefined") return false;
  // TensorFlow body-pix is unreliable on iOS Safari — use raw camera instead
  return !isIOS();
}
