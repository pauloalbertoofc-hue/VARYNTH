import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "./options";
export async function requireSession() { const session = await getServerSession(authOptions); return session?.user ? session : undefined; }
