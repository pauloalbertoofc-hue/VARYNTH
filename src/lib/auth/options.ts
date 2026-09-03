import "server-only";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { findUserByEmail, isAllowedGoogleEmail, upsertGoogleUser, verifyPassword } from "./user-store";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    GoogleProvider({ clientId: process.env.GOOGLE_AUTH_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "google-not-configured", clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "google-not-configured" }),
    CredentialsProvider({ name: "Conta VARYNTH", credentials: { email: { label: "E-mail", type: "email" }, password: { label: "Senha", type: "password" } }, async authorize(credentials) { if (!credentials?.email || !credentials.password) return null; const user = await findUserByEmail(credentials.email); if (!user?.passwordHash || !(await verifyPassword(credentials.password, user.passwordHash))) return null; return { id: user.id, name: user.name, email: user.email, role: user.role } as never; } }),
  ],
  callbacks: {
    async signIn({ user, account }) { if (account?.provider !== "google") return true; if (!user.email) return false; const existing = await findUserByEmail(user.email); if (!existing && !isAllowedGoogleEmail(user.email)) return false; const stored = existing || await upsertGoogleUser({ name: user.name, email: user.email }); user.id = stored.id; (user as typeof user & { role: string }).role = stored.role; return true; },
    async jwt({ token, user }) { if (user) { token.userId = user.id; token.role = (user as typeof user & { role?: string }).role || "member"; } return token; },
    async session({ session, token }) { if (session.user) { const secured = session.user as typeof session.user & { id: string; role: string }; secured.id = String(token.userId || token.sub || ""); secured.role = String(token.role || "member"); } return session; },
  },
};
