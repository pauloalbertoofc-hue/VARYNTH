import { get, list } from "@vercel/blob";
import { requireSession } from "@/lib/auth/require-session";

export const runtime = "nodejs";

const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN;

export async function GET(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  const requestUrl = new URL(request.url);
  let blobUrl = requestUrl.searchParams.get("url") || "";
  const name = requestUrl.searchParams.get("name") || "";

  if (!blobUrl && name) {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: "vault-books/", limit: 1000, cursor, token: blobToken() });
      const match = page.blobs.find((blob) => blob.pathname.endsWith(`-${name}`) || blob.pathname.endsWith(`/${name}`));
      if (match) {
        blobUrl = match.url;
        break;
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }

  if (!blobUrl) return Response.json({ error: "Arquivo não encontrado no armazenamento." }, { status: 404 });
  const blob = await get(blobUrl, { access: "private", token: blobToken() });
  if (!blob) return Response.json({ error: "Arquivo não encontrado no armazenamento." }, { status: 404 });

  return new Response(blob.stream, {
    headers: {
      "content-type": blob.blob.contentType || "application/octet-stream",
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(name || blob.blob.pathname.split("/").pop() || "arquivo.pdf")}`,
      "cache-control": "private, max-age=0, must-revalidate",
    },
  });
}
