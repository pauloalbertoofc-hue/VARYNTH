import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireSession } from "@/lib/auth/require-session";
import { extractVaultDocument } from "@/lib/vault/document-extractor";

export const runtime = "nodejs";

const allowed = new Set(["pdf", "epub", "mobi", "azw", "doc", "docx", "txt", "png", "jpg", "jpeg", "mp3", "m4a"]);

export async function POST(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!allowed.has(extension)) return Response.json({ error: "Formato não permitido." }, { status: 415 });
  if (file.size > 100 * 1024 * 1024) return Response.json({ error: "O arquivo deve ter até 100 MB." }, { status: 413 });
  const id = randomUUID();
  const directory = path.join(process.cwd(), ".varynth-data", "vault-uploads");
  await mkdir(directory, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(directory, `${id}-${safeName}`), bytes);
  const extraction = await extractVaultDocument(bytes, extension);
  await writeFile(path.join(directory, `${id}.json`), JSON.stringify({ id, name: file.name, ...extraction }));
  return Response.json({ id, name: file.name, size: file.size, extension, extractedText: extraction.text.slice(0, 120000), wordCount: extraction.wordCount, chapters: extraction.chapters, processingStatus: extraction.processing, processingMessage: extraction.message, indexed: Boolean(extraction.text), storedAt: new Date().toISOString() });
}
