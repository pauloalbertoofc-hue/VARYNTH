export const VARYNTH_PUBLIC_ORIGIN = "https://varynth-ynqv-plum.vercel.app";
export const VARYNTH_PUBLIC_URL = `${VARYNTH_PUBLIC_ORIGIN}/dashboard`;

export function getVarynthOrigin(fallback?: string): string {
  const configured = process.env.VARYNTH_PUBLIC_URL?.trim();
  if (configured) {
    try { return new URL(configured).origin; } catch { /* usa a origem oficial */ }
  }
  return fallback || VARYNTH_PUBLIC_ORIGIN;
}
