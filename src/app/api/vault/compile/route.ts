import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireSession } from "@/lib/auth/require-session";

type Source = { id: string; name: string; text: string; summary?: string; pageReferences?: Array<{ page: number }> };
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const { title = "Livro de consulta", sourceIds = [] } = await request.json() as { title?: string; sourceIds?: string[] };
  const directory = path.join(process.cwd(), ".varynth-data", "vault-uploads");
  const files = await readdir(directory).catch(() => [] as string[]);
  const books = (await Promise.all(files.filter((file) => file.endsWith(".json")).map(async (file) => JSON.parse(await readFile(path.join(directory, file), "utf8")) as Source))).filter((book) => sourceIds.length === 0 || sourceIds.includes(book.id));
  if (!books.length) return Response.json({ error: "Nenhuma fonte indexada foi selecionada." }, { status: 422 });
  const content = `# ${title}\n\n## Fontes\n${books.map((book) => `- ${book.name}`).join("\n")}\n\n${books.map((book, index) => `## ${index + 1}. ${book.name}\n\n${book.summary || book.text.slice(0, 1800)}\n\n**Referência:** ${book.name}${book.pageReferences?.[0] ? `, p. ${book.pageReferences[0].page}` : ""}`).join("\n\n")}\n\n## Referências\n${books.map((book) => `- ${book.name}`).join("\n")}`;
  const outputDir = path.join(process.cwd(), ".varynth-data", "compilations");
  await mkdir(outputDir, { recursive: true });
  const id = randomUUID();
  await writeFile(path.join(outputDir, `${id}.md`), content, "utf8");
  return Response.json({ id, title, content, sourceCount: books.length, createdAt: new Date().toISOString() });
}
