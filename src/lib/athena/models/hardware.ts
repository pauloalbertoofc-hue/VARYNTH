export interface HardwareProfile {
  estimatedRamMB: number;
  cpuThreads: number;
  hasWebGPU: boolean;
  tier: "LOW" | "BALANCED" | "HIGH";
}

export function detectLocalHardwareProfile(): HardwareProfile {
  let cpuThreads = 4;
  let estimatedRamMB = 8192;
  let hasWebGPU = false;

  if (typeof navigator !== "undefined") {
    if (navigator.hardwareConcurrency) {
      cpuThreads = navigator.hardwareConcurrency;
    }
    // Browser Memory API if available
    const perf = (performance as any)?.memory;
    if (perf && perf.jsHeapSizeLimit) {
      estimatedRamMB = Math.round(perf.jsHeapSizeLimit / (1024 * 1024));
    }
    hasWebGPU = "gpu" in navigator;
  }

  let tier: HardwareProfile["tier"] = "BALANCED";
  if (cpuThreads <= 4) {
    tier = "LOW";
  } else if (cpuThreads >= 12) {
    tier = "HIGH";
  }

  return {
    cpuThreads,
    estimatedRamMB,
    hasWebGPU,
    tier,
  };
}
