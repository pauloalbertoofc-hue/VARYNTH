import { IndexedDbStoreAdapter, assetStorage } from "../../persistence/indexeddb-adapter";

async function run() {
  const adapter = new IndexedDbStoreAdapter<{ id: string; blob: Blob; metadata: Record<string, unknown>; updatedAt: string }>("asset_blobs");
  const source = new Blob([new Uint8Array([0, 1, 2, 255])], { type: "audio/wav" });
  await adapter.save({ id: "audio-blob-roundtrip", blob: source, metadata: { mimeType: "audio/wav" }, updatedAt: new Date().toISOString() });
  const loaded = await adapter.getById("audio-blob-roundtrip");
  if (!(loaded?.blob instanceof Blob) || loaded.blob.size !== 4 || loaded.blob.type !== "audio/wav") throw new Error("IndexedDB asset store did not preserve Blob bytes and MIME type");

  const raw = new Uint8Array([82, 73, 70, 70]).buffer;
  await assetStorage.storeBlob("audio-arraybuffer-roundtrip", raw, { mimeType: "audio/wav" });
  const wrapped = await assetStorage.getBlob("audio-arraybuffer-roundtrip");
  if (!(wrapped instanceof Blob) || wrapped.size !== 4 || wrapped.type !== "audio/wav") throw new Error("ArrayBuffer asset must be wrapped in a durable Blob before storage");
  console.log("Audio asset storage tests passed: Blob structured clone and ArrayBuffer-to-Blob durability.");
}

void run();
