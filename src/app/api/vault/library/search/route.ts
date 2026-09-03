import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { requireSession } from "@/lib/auth/require-session";

export const runtime = "nodejs";

type IndexedBook = { id: string; name: string; text: string; chapters?: string[]; pageReferences?: Array<{ page: number; text: string }>; wordCount?: number };
const terms = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3);

export async function POST(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const { query } = await request.json() as { query?: string };
  if (!query?.trim()) return Response.json({ results: [] });
  const directory = path.join(process.cwd(), ".varynth-data", "vault-uploads");
  let files: string[] = [];
  try { files = await readdir(directory); } catch { return Response.json({ results: [] }); }
  const queryTerms = terms(query);
  const books = (await Promise.all(files.filter((file) => file.endsWith(".json")).map(async (file) => {
    try { return JSON.parse(await readFile(path.join(directory, file), "utf8")) as IndexedBook; } catch { return null; }
  }))).filter((book): book is IndexedBook => Boolean(book?.text));
  const results = books.map((book) => {
    const corpus = `${book.name} ${book.text}`.toLowerCase();
    const score = queryTerms.filter((term) => corpus.includes(term)).length;
    const first = queryTerms.find((term) => book.text.toLowerCase().includes(term));
    const position = first ? book.text.toLowerCase().indexOf(first) : 0;
    const page = book.pageReferences?.find((reference) => first && reference.text.toLowerCase().includes(first))?.page;
    return { id: book.id, name: book.name, score, page, excerpt: book.text.slice(Math.max(0, position - 220), position + 650).replace(/\s+/g, " "), chapters: book.chapters?.slice(0, 5) || [], wordCount: book.wordCount || 0 };
  }).filter((result) => result.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
  return Response.json({ results });
}
