import { LocalFailureTelemetryRecord } from "../domain/conversation";

export class LocalFailureTelemetry {
  private records: LocalFailureTelemetryRecord[] = [];
  private maxRecords = 100;

  record(
    sessionId: string,
    prompt: string,
    failureType: LocalFailureTelemetryRecord["failureType"],
    details?: Record<string, unknown>
  ): void {
    const record: LocalFailureTelemetryRecord = {
      id: "tel-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      sessionId,
      prompt,
      failureType,
      details,
    };

    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }
  }

  getRecords(): LocalFailureTelemetryRecord[] {
    return [...this.records];
  }

  clear(): void {
    this.records = [];
  }
}

export const athenaLocalTelemetry = new LocalFailureTelemetry();

