import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireSession } from "@/lib/auth/require-session";
import { assessSourceGovernance } from "@/lib/athena/quality/source-governance";
import { listIndexedVaultBooks } from "@/lib/vault/server-library";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const { title = "Livro de consulta", sourceIds = [] } = await request.json() as { title?: string; sourceIds?: string[] };
  const books = (await listIndexedVaultBooks()).filter((book) => sourceIds.length === 0 || sourceIds.includes(book.id));
  if (!books.length) return Response.json({ error: "Nenhuma fonte indexada foi selecionada." }, { status: 422 });
  const content = `# ${title}\n\n## Fontes\n${books.map((book) => `- ${book.name}`).join("\n")}\n\n${books.map((book, index) => `## ${index + 1}. ${book.name}\n\n${book.summary || book.text.slice(0, 1800)}\n\n**Referência:** ${book.name}${book.pageReferences?.[0] ? `, p. ${book.pageReferences[0].page}` : ""}`).join("\n\n")}\n\n## Referências\n${books.map((book) => `- ${book.name}`).join("\n")}`;
  const outputDir = path.join(process.cwd(), ".varynth-data", "compilations");
  const id = randomUUID();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token && token !== "[SENSITIVE]") await put(`vault-compilations/${id}.md`, content, { access: "private", token, addRandomSuffix: false });
  else { await mkdir(outputDir, { recursive: true }); await writeFile(path.join(outputDir, `${id}.md`), content, "utf8"); }
  const governance = assessSourceGovernance(content, books.map((book) => book.name));
  return Response.json({ id, title, content, governance, sourceCount: books.length, createdAt: new Date().toISOString() });
}
