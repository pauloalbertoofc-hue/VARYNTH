/** Stable local account boundary for Experience records. Legacy records without
 * an owner remain unassigned and are deliberately excluded from account views. */
export async function getExperienceOwnerId(explicitOwnerId?: string): Promise<string> {
  const explicit = explicitOwnerId?.trim();
  if (typeof window === "undefined") return explicit || "local-owner";
  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  const user = session?.user as { id?: string } | undefined;
  const ownerId = user?.id?.trim();
  if (!ownerId) throw new Error("[EXPERIENCE_OWNER_REQUIRED] Entre na sua conta para acessar a Experience Layer.");
  if (explicit && explicit !== ownerId) throw new Error("[EXPERIENCE_OWNER_MISMATCH] A conta autenticada não corresponde ao dono solicitado.");
  return ownerId;
}
