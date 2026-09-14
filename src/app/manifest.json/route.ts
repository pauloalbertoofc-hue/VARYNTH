import { getAppIcon } from "@/lib/branding/app-icon-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const icon = await getAppIcon();
    const version = encodeURIComponent(icon.updatedAt || "default");
    return Response.json({
      id: "/dashboard",
      name: "VARYNTH OS",
      short_name: "VARYNTH",
      description: "Seu OS pessoal soberano na web — hub de apps, conhecimento e estúdios criativos",
      start_url: "/dashboard",
      scope: "/",
      display: "standalone",
      background_color: "#0a0a0f",
      theme_color: "#0a0a0f",
      orientation: "any",
      categories: ["productivity", "utilities", "developer"],
      icons: [{ src: `/api/app-icon?v=${version}`, sizes: "192x192 512x512", type: "image/png", purpose: "any maskable" }],
    }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "O manifesto do app está temporariamente indisponível." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
