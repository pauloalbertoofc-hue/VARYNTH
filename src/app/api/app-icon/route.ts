import { getAppIcon } from "@/lib/branding/app-icon-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const icon = await getAppIcon();
    return new Response(new Uint8Array(icon.bytes), {
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store, max-age=0",
        "x-content-type-options": "nosniff",
        ...(icon.updatedAt ? { "last-modified": new Date(icon.updatedAt).toUTCString() } : {}),
      },
    });
  } catch {
    return Response.json({ error: "O ícone global está temporariamente indisponível." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
