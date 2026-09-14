import "server-only";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "./options";
const localOwnerSession: Session = {
  user: { name: "Paulo", email: "local@varynth.app", role: "owner" } as Session["user"] & { role: string },
  expires: "9999-12-31T23:59:59.999Z",
};

export async function requireSession() {
  if (process.env.VARYNTH_AUTH_ENABLED !== "true") return localOwnerSession;
  const session = await getServerSession(authOptions);
  return session?.user ? session : undefined;
}

export async function requireOwner() {
  const session = await requireSession();
  const role = (session?.user as Session["user"] & { role?: string } | undefined)?.role;
  return role === "owner" ? session : undefined;
}
