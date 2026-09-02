import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) { const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET }); if (token) return NextResponse.next(); const login = new URL("/login", request.url); login.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search); if (request.nextUrl.pathname.startsWith("/api/")) return Response.json({ error: "Autenticação necessária." }, { status: 401 }); return NextResponse.redirect(login); }
export const config = { matcher: ["/((?!login|api/auth|favicon.ico|manifest.json|_next/static|_next/image).*)"] };
