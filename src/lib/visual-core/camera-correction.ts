import type { CameraQualityReport } from "./camera-quality";

export type CameraCorrectionParameters = {
  exposure: number;
  contrast: number;
  warmth: number;
  tint: number;
  vignette: number;
};

/** Conservative, deterministic correction suggestion; never replaces the captured original. */
export function suggestCameraCorrection(report: CameraQualityReport): CameraCorrectionParameters {
  return {
    exposure: Math.max(-0.18, Math.min(0.18, 0.5 - report.exposure.meanLuma)),
    contrast: 0.04,
    warmth: 0,
    tint: 0,
    vignette: 0,
  };
}
