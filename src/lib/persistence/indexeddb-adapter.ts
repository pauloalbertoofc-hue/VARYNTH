import { StorageAdapter, AssetStorageAdapter } from "./contracts";
import { fallbackPolicyEngine } from "./fallback-policy";

const DB_NAME = "VARYNTH_SOVEREIGN_DB_V1";
const DB_VERSION = 1;

export const KNOWN_STORES = [
  "projects",
  "tasks",
  "notes",
  "vault",
  "chronos",
  "people",
  "labs",
  "theses",
  "researches",
  "evidences",
  "opportunities",
  "forge",
  "trash",
  "activities",
  "artifacts",
  "doc_reviews",
  "doc_audit",
  "notifications",
  "athena_messages",
  "athena_episodes",
  "asset_blobs",
] as const;

export type StoreName = (typeof KNOWN_STORES)[number];

class IndexedDbConnection {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryFallback: Map<string, Map<string, any>> = new Map();

  constructor() {
    KNOWN_STORES.forEach((name) => {
      this.memoryFallback.set(name, new Map());
    });
  }

  public isAvailable(): boolean {
    return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
  }

  public getDb(): Promise<IDBDatabase> {
    if (!this.isAvailable()) {
      return Promise.reject(new Error("IndexedDB indisponível neste ambiente."));
    }

    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          KNOWN_STORES.forEach((storeName) => {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath: "id" });
            }
          });
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (err) {
        reject(err);
      }
    });

    return this.dbPromise;
  }

  public getMemoryStore(name: string): Map<string, any> {
    if (!this.memoryFallback.has(name)) {
      this.memoryFallback.set(name, new Map());
    }
    return this.memoryFallback.get(name)!;
  }
}

export const dbConnection = new IndexedDbConnection();

export class IndexedDbStoreAdapter<T extends { id: string }> implements StorageAdapter<T> {
  private storeName: StoreName;

  constructor(storeName: StoreName) {
    this.storeName = storeName;
  }

  private cloneRecord<V>(value: V): V {
    if (this.storeName === "asset_blobs" && typeof structuredClone === "function") {
      try { return structuredClone(value); } catch { /* Fall back for legacy/non-cloneable records. */ }
    }
    return JSON.parse(JSON.stringify(value));
  }

  public async getById(id: string): Promise<T | null> {
    if (!dbConnection.isAvailable()) {
      const item = dbConnection.getMemoryStore(this.storeName).get(id);
      return item ? this.cloneRecord(item) : null;
    }

    try {
      const db = await dbConnection.getDb();
      return new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const req = store.get(id);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      const item = dbConnection.getMemoryStore(this.storeName).get(id);
      return item ? this.cloneRecord(item) : null;
    }
  }

  public async getAll(filter?: (item: T) => boolean): Promise<T[]> {
    if (!dbConnection.isAvailable()) {
      const all = Array.from(dbConnection.getMemoryStore(this.storeName).values());
      const res = filter ? all.filter(filter) : all;
      return this.cloneRecord(res);
    }

    try {
      const db = await dbConnection.getDb();
      return new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const req = store.getAll();

        req.onsuccess = () => {
          const list: T[] = req.result || [];
          resolve(filter ? list.filter(filter) : list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      const all = Array.from(dbConnection.getMemoryStore(this.storeName).values());
      const res = filter ? all.filter(filter) : all;
      return this.cloneRecord(res);
    }
  }

  public async save(item: T): Promise<T> {
    const clone = this.cloneRecord(item);

    // 1. Fallback Policy Evaluation
    const perm = fallbackPolicyEngine.evaluateWritePermission(this.storeName, clone);
    if (!perm.allowed) {
      throw new Error(perm.error || `Gravação bloqueada na coleção ${this.storeName}`);
    }

    dbConnection.getMemoryStore(this.storeName).set(clone.id, clone);

    if (!dbConnection.isAvailable()) {
      return clone;
    }

    try {
      const db = await dbConnection.getDb();
      return new Promise<T>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const req = store.put(clone);

        req.onsuccess = () => resolve(clone);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      // In fail-closed, do not report false success
      throw err;
    }
  }

  public async saveBatch(items: T[]): Promise<void> {
    const clones = items.map((item) => this.cloneRecord(item));

    // 1. Fallback Policy Evaluation
    const perm = fallbackPolicyEngine.evaluateWritePermission(this.storeName, clones);
    if (!perm.allowed) {
      throw new Error(perm.error || `Gravação em lote bloqueada na coleção ${this.storeName}`);
    }

    clones.forEach((clone) => {
      dbConnection.getMemoryStore(this.storeName).set(clone.id, clone);
    });

    if (!dbConnection.isAvailable()) {
      return;
    }

    try {
      const db = await dbConnection.getDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);

        clones.forEach((clone) => store.put(clone));

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      throw err;
    }
  }

  public async delete(id: string): Promise<boolean> {
    dbConnection.getMemoryStore(this.storeName).delete(id);

    if (!dbConnection.isAvailable()) {
      return true;
    }

    try {
      const db = await dbConnection.getDb();
      return new Promise<boolean>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const req = store.delete(id);

        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return true;
    }
  }

  public async clear(): Promise<void> {
    dbConnection.getMemoryStore(this.storeName).clear();

    if (!dbConnection.isAvailable()) {
      return;
    }

    try {
      const db = await dbConnection.getDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const req = store.clear();

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // fallback cleared
    }
  }

  public async count(): Promise<number> {
    if (!dbConnection.isAvailable()) {
      return dbConnection.getMemoryStore(this.storeName).size;
    }

    try {
      const db = await dbConnection.getDb();
      return new Promise<number>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const req = store.count();

        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return dbConnection.getMemoryStore(this.storeName).size;
    }
  }
}

export class AssetBlobStorageAdapter implements AssetStorageAdapter {
  private blobStore = new IndexedDbStoreAdapter<{ id: string; blob: any; metadata: Record<string, unknown>; updatedAt: string }>("asset_blobs");
  private memoryBlobs = new Map<string, Blob | string>();

  public async storeBlob(id: string, blob: Blob | ArrayBuffer | string, metadata: Record<string, unknown> = {}): Promise<string> {
    const stored = blob instanceof ArrayBuffer ? new Blob([blob], { type: String(metadata.mimeType || "application/octet-stream") }) : blob;
    this.memoryBlobs.set(id, stored);
    await this.blobStore.save({
      id,
      blob: stored,
      metadata,
      updatedAt: new Date().toISOString(),
    });
    return id;
  }

  public async getBlob(id: string): Promise<Blob | string | null> {
    const memoryBlob = this.memoryBlobs.get(id);
    if (memoryBlob) return memoryBlob;
    const item = await this.blobStore.getById(id);
    if (!item) return null;
    if (item.blob instanceof Blob || typeof item.blob === "string") this.memoryBlobs.set(id, item.blob);
    return item.blob;
  }

  public async getBlobUrl(id: string): Promise<string | null> {
    const blob = await this.getBlob(id);
    if (!blob) return null;
    if (typeof blob === "string") return blob;
    if (typeof window !== "undefined" && window.URL && blob instanceof Blob) {
      return window.URL.createObjectURL(blob);
    }
    return null;
  }

  public async deleteBlob(id: string): Promise<boolean> {
    this.memoryBlobs.delete(id);
    return this.blobStore.delete(id);
  }

  public async listAssets(): Promise<{ id: string; sizeBytes: number; mimeType?: string; updatedAt: string }[]> {
    const all = await this.blobStore.getAll();
    return all.map((a) => ({
      id: a.id,
      sizeBytes: typeof a.blob === "string" ? a.blob.length : (a.blob as Blob)?.size || 0,
      mimeType: (a.metadata?.mimeType as string) || undefined,
      updatedAt: a.updatedAt,
    }));
  }

  public async getStorageUsage(): Promise<{ usedBytes: number; quotaBytes: number }> {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        return {
          usedBytes: est.usage || 0,
          quotaBytes: est.quota || 1024 * 1024 * 1024, // 1 GB fallback
        };
      } catch {
        // ignore
      }
    }
    return { usedBytes: 1024 * 1024, quotaBytes: 1024 * 1024 * 500 };
  }
}

export const assetStorage = new AssetBlobStorageAdapter();
export const assetStore = assetStorage;
