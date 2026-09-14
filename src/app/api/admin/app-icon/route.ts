import { requireOwner } from "@/lib/auth/require-session";
import { getAppIcon, resetAppIcon, saveAppIcon } from "@/lib/branding/app-icon-store";
import { MAX_APP_ICON_BYTES, validateAppIconPng } from "@/lib/branding/app-icon-validation";

export const runtime = "nodejs";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function GET() {
  if (!await requireOwner()) return Response.json({ error: "Acesso de proprietário necessário." }, { status: 403 });
  try {
    const icon = await getAppIcon();
    return Response.json({ updatedAt: icon.updatedAt, updatedBy: icon.updatedBy, isDefault: icon.isDefault }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível consultar o ícone global." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const owner = await requireOwner();
  if (!owner) return Response.json({ error: "Acesso de proprietário necessário." }, { status: 403 });
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });

  try {
    const form = await request.formData();
    const file = form.get("icon");
    if (!(file instanceof File) || file.type !== "image/png") {
      return Response.json({ error: "Escolha uma imagem PNG quadrada." }, { status: 400 });
    }
    if (file.size > MAX_APP_ICON_BYTES) return Response.json({ error: "A imagem deve ter no máximo 512 KB." }, { status: 413 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const validationError = validateAppIconPng(bytes);
    if (validationError) return Response.json({ error: validationError }, { status: 400 });

    const updated = await saveAppIcon(bytes, owner.user?.email || owner.user?.name || "proprietário");
    return Response.json({ ...updated, isDefault: false }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar o ícone global." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!await requireOwner()) return Response.json({ error: "Acesso de proprietário necessário." }, { status: 403 });
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  try {
    await resetAppIcon();
    const icon = await getAppIcon();
    return Response.json({ updatedAt: icon.updatedAt, isDefault: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível restaurar o ícone padrão." }, { status: 503 });
  }
}
