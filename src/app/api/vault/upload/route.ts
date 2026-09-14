import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireSession } from "@/lib/auth/require-session";
import { extractVaultDocument } from "@/lib/vault/document-extractor";
import { get, put } from "@vercel/blob";

export const runtime = "nodejs";

const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN;

const allowed = new Set(["pdf", "epub", "mobi", "azw", "doc", "docx", "txt", "png", "jpg", "jpeg", "mp3", "m4a"]);

export async function POST(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  const isJson = request.headers.get("content-type")?.includes("application/json");
  const blobInput = isJson ? await request.json() as { url: string; name: string; size: number; literaryCategory?: string; workType?: string; format?: string; primarySubject?: string; tags?: string[] } : null;
  const form = isJson ? null : await request.formData();
  const file = form?.get("file");
  if (!blobInput && !(file instanceof File)) return Response.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  const name = blobInput?.name || (file as File).name;
  const size = blobInput?.size || (file as File).size;
  const extension = name.split(".").pop()?.toLowerCase() || "";
  if (!allowed.has(extension)) return Response.json({ error: "Formato não permitido." }, { status: 415 });
  if (size > 1024 * 1024 * 1024) return Response.json({ error: "O arquivo deve ter até 1 GB." }, { status: 413 });
  const id = randomUUID();
  const directory = path.join(process.cwd(), ".varynth-data", "vault-uploads");
  if (!blobInput) await mkdir(directory, { recursive: true });
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const remote = blobInput ? await get(blobInput.url, { access: "private", token: blobToken() }) : null;
  if (blobInput && !remote) return Response.json({ error: "O arquivo enviado não foi encontrado no armazenamento." }, { status: 404 });
  const bytes = blobInput ? Buffer.from(await new Response(remote!.stream).arrayBuffer()) : Buffer.from(await (file as File).arrayBuffer());
  const storedPath = path.join(directory, `${id}-${safeName}`);
  const indexPath = path.join(directory, `${id}.json`);
  if (!blobInput) await writeFile(storedPath, bytes);
  try {
    const extraction = await extractVaultDocument(bytes, extension);
    const index = JSON.stringify({ id, name, blobUrl: blobInput?.url, literaryCategory: blobInput?.literaryCategory, workType: blobInput?.workType, format: blobInput?.format, primarySubject: blobInput?.primarySubject, tags: blobInput?.tags || [], taxonomyVersion: blobInput ? 2 : undefined, ...extraction });
    if (!blobInput) await writeFile(indexPath, index);
    if (blobInput) await put(`vault-indexes/${id}.json`, index, { access: "private", addRandomSuffix: false, token: blobToken() });
    return Response.json({ id, name, size, extension, extractedText: extraction.text.slice(0, 120000), summary: extraction.summary, wordCount: extraction.wordCount, chapters: extraction.chapters, processingStatus: extraction.processing, processingMessage: extraction.message, indexed: Boolean(extraction.text), storedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? `${error.message} O arquivo foi preservado e poderá ser processado novamente.` : "Falha na indexação. O arquivo foi preservado." }, { status: 422 });
  }
}
