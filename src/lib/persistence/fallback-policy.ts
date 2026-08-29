import { DataClass, FallbackMode, StorageHealthState, StorageCapabilities } from "./contracts";
import { StoreName } from "./indexeddb-adapter";
import { notificationService } from "../notifications/notification-service";
import { athenaEventBus } from "../athena/events/event-bus";

const MAX_LOCAL_STORAGE_ENTRY_BYTES = 25 * 1024; // 25 KB limit

export class FallbackPolicyEngine {
  private protectedMode = false;
  private protectedReason = "";

  public getDataClass(storeName: StoreName): DataClass {
    switch (storeName) {
      case "notifications":
        return "LIGHTWEIGHT_STATE";
      case "athena_messages":
      case "athena_episodes":
        return "COGNITIVE_DATA";
      case "asset_blobs":
        return "LARGE_ASSET_BLOB";
      default:
        return "STRUCTURED_APP_DATA";
    }
  }

  public detectCapabilities(): StorageCapabilities {
    const isLocalStorage = typeof window !== "undefined" && typeof window.localStorage !== "undefined";
    const isIndexedDB = typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
    const isOpfs = typeof navigator !== "undefined" && typeof navigator.storage?.getDirectory === "function";

    return {
      localStorage: isLocalStorage,
      indexedDB: isIndexedDB,
      opfs: isOpfs,
    };
  }

  public canFallbackToLocalStorage(dataClass: DataClass, estimatedSizeBytes = 0): boolean {
    if (dataClass === "LIGHTWEIGHT_STATE") {
      return estimatedSizeBytes <= MAX_LOCAL_STORAGE_ENTRY_BYTES;
    }
    // STRUCTURED_APP_DATA, COGNITIVE_DATA, LARGE_ASSET_BLOB NEVER blind fallback to localStorage
    return false;
  }

  public getFallbackMode(dataClass: DataClass, estimatedSizeBytes = 0): FallbackMode {
    if (dataClass === "LIGHTWEIGHT_STATE") {
      return estimatedSizeBytes <= MAX_LOCAL_STORAGE_ENTRY_BYTES ? "LOCAL_STORAGE" : "FAIL_CLOSED";
    }
    if (dataClass === "COGNITIVE_DATA") {
      return "MEMORY_ONLY";
    }
    if (dataClass === "LARGE_ASSET_BLOB") {
      return "FAIL_CLOSED";
    }
    if (dataClass === "TRANSIENT_RUNTIME") {
      return "MEMORY_ONLY";
    }
    // STRUCTURED_APP_DATA:
    return "FAIL_CLOSED";
  }

  public isProtectedModeActive(): boolean {
    return this.protectedMode;
  }

  public getProtectedReason(): string {
    return this.protectedReason;
  }

  public enterProtectedMode(reason: string): void {
    if (!this.protectedMode) {
      this.protectedMode = true;
      this.protectedReason = reason;

      athenaEventBus.emit("SYSTEM_ALERT", {
        title: "VARYNTH entrou em Modo Protegido",
        message: `Armazenamento estruturado indisponível (${reason}). Gravações foram bloqueadas para proteger seus dados.`,
        severity: "CRITICAL",
        source: "SYSTEM",
      });

      notificationService.create({
        type: "STORAGE_PROTECTED_MODE",
        title: "Modo Protegido Ativado",
        message: `Armazenamento estruturado indisponível (${reason}). Algumas alterações foram temporariamente bloqueadas para proteger seus dados.`,
        severity: "CRITICAL",
        source: "SYSTEM",
        targetPath: "/modules/technical-archive",
      });
    }
  }

  public exitProtectedMode(): void {
    this.protectedMode = false;
    this.protectedReason = "";
  }

  public evaluateWritePermission(storeName: StoreName, payload: unknown): { allowed: boolean; mode: FallbackMode; error?: string } {
    if (this.isProtectedModeActive()) {
      return {
        allowed: false,
        mode: "FAIL_CLOSED",
        error: `[STORAGE_PROTECTED] Gravação bloqueada: ${this.protectedReason}`,
      };
    }

    // If in Server/Node test environment, memory fallback is authorized
    if (typeof window === "undefined") {
      return { allowed: true, mode: "MEMORY_ONLY" };
    }

    const dataClass = this.getDataClass(storeName);
    const estimatedSize = JSON.stringify(payload || {}).length;
    const caps = this.detectCapabilities();

    // If IndexedDB is available in browser, normal write allowed
    if (caps.indexedDB) {
      return { allowed: true, mode: "LOCAL_STORAGE" };
    }

    // When IndexedDB is UNAVAILABLE in Browser:
    const mode = this.getFallbackMode(dataClass, estimatedSize);

    if (mode === "FAIL_CLOSED") {
      this.enterProtectedMode(`IndexedDB indisponível para gravação na coleção ${storeName}`);
      return {
        allowed: false,
        mode: "FAIL_CLOSED",
        error: `[STORAGE_PROTECTED] Gravação bloqueada: '${storeName}' requer IndexedDB ativo. Fallback para localStorage proibido por segurança.`,
      };
    }

    if (mode === "LOCAL_STORAGE") {
      if (caps.localStorage) {
        return { allowed: true, mode: "LOCAL_STORAGE" };
      }
      return {
        allowed: false,
        mode: "FAIL_CLOSED",
        error: "LocalStorage também indisponível.",
      };
    }

    if (mode === "MEMORY_ONLY") {
      return { allowed: true, mode: "MEMORY_ONLY" };
    }

    return { allowed: false, mode: "FAIL_CLOSED", error: "Operação não autorizada pela política de fallback." };
  }
}

export const fallbackPolicyEngine = new FallbackPolicyEngine();
