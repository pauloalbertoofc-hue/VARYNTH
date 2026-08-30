export type FailureInjectionPoint =
  | "before-snapshot"
  | "after-snapshot"
  | "before-persistence"
  | "after-logical-relation-update"
  | "before-asset-usage-update"
  | "after-asset-usage-update"
  | "before-commit"
  | "after-commit-before-notification"
  | "during-backup"
  | "during-restore"
  | "during-asset-write"
  | "during-job-output-promotion"
  | "during-version-creation"
  | "storage-exhaustion"
  | "event-listener-failure"
  | "notification-failure";

export class FailureInjector {
  private static enabled = false;
  private static seed = 12345;
  private static prngState = 12345;
  private static plannedFailures: Map<FailureInjectionPoint, { count: number; condition?: () => boolean }> = new Map();
  private static executionTrace: Array<{ point: FailureInjectionPoint; triggered: boolean; timestamp: string }> = [];

  /**
   * Deterministic PRNG (Mulberry32).
   */
  private static nextRandom(): number {
    let t = (this.prngState += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public static enable(): void {
    // In production environments without explicit test flag, prevent activation
    if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production" && !process.env.VARYNTH_TEST_HARNESS) {
      console.warn("[FailureInjector] Ativação rejeitada em ambiente de produção.");
      return;
    }
    this.enabled = true;
  }

  public static disable(): void {
    this.enabled = false;
    this.plannedFailures.clear();
    this.executionTrace = [];
  }

  public static isEnabled(): boolean {
    return this.enabled;
  }

  public static setSeed(seed: number): void {
    this.seed = seed;
    this.prngState = seed;
  }

  public static getSeed(): number {
    return this.seed;
  }

  public static reset(): void {
    this.disable();
    this.setSeed(12345);
  }

  public static failAt(point: FailureInjectionPoint, condition?: () => boolean): void {
    if (!this.enabled) return;
    this.plannedFailures.set(point, { count: 1, condition });
  }

  public static shouldFail(point: FailureInjectionPoint): boolean {
    if (!this.enabled) return false;

    const planned = this.plannedFailures.get(point);
    if (!planned || planned.count <= 0) {
      this.executionTrace.push({ point, triggered: false, timestamp: new Date().toISOString() });
      return false;
    }

    if (planned.condition && !planned.condition()) {
      this.executionTrace.push({ point, triggered: false, timestamp: new Date().toISOString() });
      return false;
    }

    // Decrement trigger count
    planned.count -= 1;
    if (planned.count <= 0) {
      this.plannedFailures.delete(point);
    }

    this.executionTrace.push({ point, triggered: true, timestamp: new Date().toISOString() });
    return true;
  }

  public static checkAndThrow(point: FailureInjectionPoint, message?: string): void {
    if (this.shouldFail(point)) {
      throw new Error(
        `[INJECTED_FAILURE:${point}] ${message || "Falha deliberada injetada pelo harness de testes de resiliência."}`
      );
    }
  }

  public static getExecutionTrace(): Array<{ point: FailureInjectionPoint; triggered: boolean; timestamp: string }> {
    return JSON.parse(JSON.stringify(this.executionTrace));
  }
}

