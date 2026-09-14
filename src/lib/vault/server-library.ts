import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { get, list } from "@vercel/blob";

export type IndexedVaultBook = { id: string; name: string; text: string; summary?: string; chapters?: string[]; pageReferences?: Array<{ page: number; text: string }>; wordCount?: number; blobUrl?: string; literaryCategory?: string; workType?: string; format?: string; primarySubject?: string; tags?: string[]; taxonomyVersion?: number };

export async function listIndexedVaultBooks(): Promise<IndexedVaultBook[]> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token && token !== "[SENSITIVE]") {
    const found = await list({ prefix: "vault-indexes/", token });
    return (await Promise.all(found.blobs.map(async (blob) => {
      try { const result = await get(blob.url, { access: "private", token }); return result ? JSON.parse(await new Response(result.stream).text()) as IndexedVaultBook : null; } catch { return null; }
    }))).filter((book): book is IndexedVaultBook => Boolean(book?.text));
  }
  const directory = path.join(process.cwd(), ".varynth-data", "vault-uploads");
  const files = await readdir(directory).catch(() => [] as string[]);
  return (await Promise.all(files.filter((file) => file.endsWith(".json")).map(async (file) => {
    try { return JSON.parse(await readFile(path.join(directory, file), "utf8")) as IndexedVaultBook; } catch { return null; }
  }))).filter((book): book is IndexedVaultBook => Boolean(book?.text));
}
