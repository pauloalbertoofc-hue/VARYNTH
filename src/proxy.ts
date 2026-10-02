import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { isClientApiPath, isClientPath, isClientRole } from "@/lib/auth/client-access";
import { isMusicBlobCallbackRequest } from "@/lib/auth/music-blob-callback";
export async function proxy(request: NextRequest) {
  // The product homepage and installation guide are public entry points.
  if (request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/manifest.json" || request.nextUrl.pathname === "/api/app-icon" || request.nextUrl.pathname.startsWith("/download")) return NextResponse.next();
  // Vercel Blob callbacks are authenticated by the route's signature verifier, not a browser session.
  if (isMusicBlobCallbackRequest(request.method, request.nextUrl.pathname, request.headers.get("x-vercel-signature"))) return NextResponse.next();
  // A ativação é explícita para que um deploy não bloqueie a plataforma antes
  // de NEXTAUTH_SECRET, usuários e OAuth estarem configurados na Vercel.
  if (process.env.VARYNTH_AUTH_ENABLED !== "true") return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET });
  if (token) {
    if (isClientRole(token.role)) {
      const pathname = request.nextUrl.pathname;
      const allowed = pathname.startsWith("/api/") ? isClientApiPath(pathname) : isClientPath(pathname);
      if (!allowed) {
        if (pathname.startsWith("/api/")) return Response.json({ error: "Este recurso não está disponível para contas Cliente." }, { status: 403 });
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
  if (request.nextUrl.pathname.startsWith("/api/")) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  return NextResponse.redirect(login);
}
export const config = { matcher: ["/((?!login|api/auth|favicon.ico|manifest.json|_next/static|_next/image).*)"] };
