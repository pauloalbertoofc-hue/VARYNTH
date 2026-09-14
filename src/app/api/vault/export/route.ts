import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import PDFDocument from "pdfkit";
import { requireSession } from "@/lib/auth/require-session";
import { put } from "@vercel/blob";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const { title, content, format } = await request.json() as { title: string; content: string; format: "docx" | "pdf" };
  const lines = content.split("\n"); const directory = path.join(process.cwd(), ".varynth-data", "exports"); const token = process.env.BLOB_READ_WRITE_TOKEN; if (!token || token === "[SENSITIVE]") await mkdir(directory, { recursive: true });
  if (format === "docx") { const doc = new Document({ sections: [{ children: lines.map((line) => new Paragraph({ text: line.replace(/^#+\s*/, ""), heading: line.startsWith("# ") ? HeadingLevel.HEADING_1 : line.startsWith("## ") ? HeadingLevel.HEADING_2 : undefined })) }] }); const bytes = await Packer.toBuffer(doc); if (token && token !== "[SENSITIVE]") await put(`vault-exports/livro-de-consulta-${Date.now()}.docx`, bytes, { access: "private", token }); else await writeFile(path.join(directory, "livro-de-consulta.docx"), bytes); return new Response(new Uint8Array(bytes), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "content-disposition": "attachment; filename=livro-de-consulta.docx" } }); }
  const pdf = new PDFDocument({ margin: 56 }); const chunks: Buffer[] = []; pdf.on("data", (chunk) => chunks.push(chunk)); const done = new Promise<Buffer>((resolve) => pdf.on("end", () => resolve(Buffer.concat(chunks)))); pdf.fontSize(20).text(title || "Livro de consulta"); lines.slice(1).forEach((line) => pdf.fontSize(line.startsWith("#") ? 15 : 10).text(line.replace(/^#+\s*/, "") || " ")); pdf.end(); const bytes = await done; if (token && token !== "[SENSITIVE]") await put(`vault-exports/livro-de-consulta-${Date.now()}.pdf`, bytes, { access: "private", token }); else await writeFile(path.join(directory, "livro-de-consulta.pdf"), bytes); return new Response(new Uint8Array(bytes), { headers: { "content-type": "application/pdf", "content-disposition": "attachment; filename=livro-de-consulta.pdf" } });
}
