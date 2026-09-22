import { requireOwner, requireSession } from "@/lib/auth/require-session";
import { domainRegistry, DomainRegistry } from "@/lib/knowledge";
import type { DomainDefinition } from "@/lib/knowledge/domain-registry";
import { domainRegistryPersistenceMode, readPersistedDomainRegistry, savePersistedDomainRegistry } from "@/lib/knowledge/domain-registry-store";

export const runtime = "nodejs";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

async function loadRegistry() {
  const stored = await readPersistedDomainRegistry();
  if (stored) domainRegistry.replaceDomains(stored.domains);
  return { revision: stored?.revision || 0, persisted: Boolean(stored) };
}

export async function GET() {
  const session = await requireSession();
  if (!session) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  try {
    const state = await loadRegistry();
    const role = (session.user as typeof session.user & { role?: string }).role;
    const persistenceMode = domainRegistryPersistenceMode();
    return Response.json({ domains: domainRegistry.listAllDomains(), awarenessIndex: domainRegistry.getAwarenessIndex(), ...state, persistenceMode, ownerControlsAvailable: role === "owner" && persistenceMode !== "UNAVAILABLE", generatedAt: new Date().toISOString(), accessModel: "awareness_without_unrestricted_content" });
  } catch {
    return Response.json({ error: "Domain Registry persistente indisponível." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!await requireOwner()) return Response.json({ error: "Acesso de proprietário necessário." }, { status: 403 });
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { operation?: unknown; domainId?: unknown; agentId?: unknown; expectedRevision?: unknown; domain?: unknown };
  if (typeof body.operation !== "string" || !["TRANSFER_OWNER", "REGISTER_SPECIALIST", "REGISTER_CAPABILITY", "REGISTER_DOMAIN"].includes(body.operation)) return Response.json({ error: "Operação inválida." }, { status: 400 });
  try {
    const stored = await readPersistedDomainRegistry();
    const expectedRevision = typeof body.expectedRevision === "number" ? body.expectedRevision : -1;
    const currentRevision = stored?.revision || 0;
    if (expectedRevision !== currentRevision) return Response.json({ error: "Domain Registry desatualizado; atualize a tela e tente novamente." }, { status: 409 });
    const candidate = new DomainRegistry(false);
    candidate.replaceDomains(stored?.domains || domainRegistry.listAllDomains());

    if (body.operation === "REGISTER_DOMAIN") {
      const definition = body.domain as DomainDefinition | undefined;
      if (!definition || typeof definition.id !== "string" || candidate.getDomain(definition.id)) return Response.json({ error: "Definição inválida ou domínio já existente." }, { status: 400 });
      candidate.register(definition);
    } else {
      if (typeof body.domainId !== "string" || !body.domainId.trim()) return Response.json({ error: "domainId obrigatório." }, { status: 400 });
      if (body.operation === "TRANSFER_OWNER" && typeof body.agentId === "string") candidate.transferOwnership(body.domainId, body.agentId);
      else if (body.operation === "REGISTER_SPECIALIST" && typeof body.agentId === "string") candidate.registerSpecialist(body.domainId, body.agentId);
      else if (body.operation === "REGISTER_CAPABILITY" && typeof body.agentId === "string") candidate.registerCapability(body.domainId, body.agentId);
      else return Response.json({ error: "Agente ou capability inválidos." }, { status: 400 });
    }

    const domains = candidate.listAllDomains();
    const revision = await savePersistedDomainRegistry(domains, expectedRevision);
    domainRegistry.replaceDomains(domains);
    return Response.json({ updated: true, operation: body.operation, domains, awarenessIndex: domainRegistry.getAwarenessIndex(), revision, persistenceMode: domainRegistryPersistenceMode(), generatedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar Domain Registry.";
    const status = message.includes("PERSISTENCE_UNAVAILABLE") || message.includes("STORE_UNAVAILABLE") ? 503 : message.includes("REVISION_CONFLICT") || message.includes("WRITE_BUSY") ? 409 : 400;
    return Response.json({ error: status === 503 ? "Domain Registry persistente indisponível." : message }, { status });
  }
}
