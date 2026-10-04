"use client";

import { useEffect, useMemo, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { applyKnowledgeClassification, domainRegistry, findKnowledgeConflicts, listKnowledgeAccessLogs, listKnowledgeRelationships, publishKnowledge, queryKnowledge, revokeKnowledge, storeKnowledge, updateKnowledge } from "@/lib/knowledge";
import type { KnowledgeItem, KnowledgeLifecycleState } from "@/lib/knowledge";
import { availableKnowledgeLifecycleTransitions } from "@/lib/knowledge/lifecycle";
import type { KnowledgeRelationship } from "@/lib/knowledge";
import type { DomainDefinition } from "@/lib/knowledge/domain-registry";
import { buildKnowledgeTaxonomy } from "@/lib/knowledge/taxonomy";
import { KnowledgeTaxonomyTree } from "./KnowledgeTaxonomyTree";
import { KnowledgeLifecycleControl } from "./KnowledgeLifecycleControl";
import { useVarynthStore } from "@/lib/store/useVarynthStore";

export default function KnowledgePage() {
  const { isLoaded: vaultLoaded, vaultItems, updateVaultItem } = useVarynthStore();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [lifecycleItems, setLifecycleItems] = useState<KnowledgeItem[]>([]);
  const [domains, setDomains] = useState<DomainDefinition[]>(() => domainRegistry.listAllDomains());
  const [domainRevision, setDomainRevision] = useState(0);
  const [domainPersistence, setDomainPersistence] = useState("LOADING");
  const [knowledgePersistence, setKnowledgePersistence] = useState("LOADING");
  const [canManageDomains, setCanManageDomains] = useState(false);
  const [ownerTargets, setOwnerTargets] = useState<Record<string, string>>({});
  const [coOwnerTargets, setCoOwnerTargets] = useState<Record<string, string>>({});
  const [routingTermTargets, setRoutingTermTargets] = useState<Record<string, string>>({});
  const [routingPriorityTargets, setRoutingPriorityTargets] = useState<Record<string, string>>({});
  const [bridgeTargets, setBridgeTargets] = useState<Record<string, { domain: string; related?: string; concepts: string; description: string }>>({});
  const [busyDomain, setBusyDomain] = useState<string | null>(null);
  const [domainMessage, setDomainMessage] = useState("");
  const [conflicts, setConflicts] = useState<Array<{ groupId: string; items: KnowledgeItem[] }>>([]);
  const [accessCount, setAccessCount] = useState(0);
  const [relationships, setRelationships] = useState<KnowledgeRelationship[]>([]);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const [classificationTargets, setClassificationTargets] = useState<Record<string, string>>({});
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  useEffect(() => {
    let active = true;
    void fetch("/api/knowledge/domains", { cache: "no-store" }).then(async (response) => {
      const result = await response.json().catch(() => ({})) as { domains?: DomainDefinition[]; revision?: number; persistenceMode?: string; ownerControlsAvailable?: boolean };
      if (!response.ok || !Array.isArray(result.domains)) throw new Error("Domain Registry indisponível.");
      if (!active) return;
      domainRegistry.replaceDomains(result.domains);
      setDomains(result.domains);
      setDomainRevision(result.revision || 0);
      setDomainPersistence(result.persistenceMode || "UNAVAILABLE");
      setCanManageDomains(Boolean(result.ownerControlsAvailable));
    }).catch(() => { if (active) { setDomainPersistence("UNAVAILABLE"); setDomainMessage("Não foi possível carregar o Domain Registry persistente."); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!canManageDomains) return;
    let active = true;
    void fetch("/api/knowledge/items?view=lifecycle", { cache: "no-store" }).then(async (response) => {
      const result = await response.json().catch(() => ({})) as { items?: KnowledgeItem[] };
      if (response.ok && Array.isArray(result.items) && active) setLifecycleItems(result.items);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [canManageDomains]);
  useEffect(() => {
    let active = true;
    void fetch("/api/knowledge/items", { cache: "no-store" }).then(async (response) => {
      const result = await response.json().catch(() => ({})) as { persistenceMode?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Knowledge remoto indisponível.");
      if (active) setKnowledgePersistence(result.persistenceMode || "UNAVAILABLE");
    }).catch(() => { if (active) setKnowledgePersistence("UNAVAILABLE"); });
    return () => { active = false; };
  }, []);
  useEffect(() => { void Promise.all([queryKnowledge({ requester: "athena", query, domain: domain || undefined, purpose: "knowledge center retrieval", scope: "ALL" }), findKnowledgeConflicts(), listKnowledgeAccessLogs(), listKnowledgeRelationships()]).then(([nextItems, nextConflicts, logs, nextRelationships]) => { setItems(nextItems); setConflicts(nextConflicts); setAccessCount(logs.length); setRelationships(nextRelationships); }); }, [query, domain]);
  async function authorize(operation: "CLASSIFY" | "PUBLISH" | "REVOKE" | "LIFECYCLE", itemId: string) {
    const response = await fetch("/api/knowledge/authorize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation, itemId }) });
    const result = await response.json().catch(() => ({})) as { authorized?: boolean; error?: string };
    if (!response.ok || !result.authorized) throw new Error(result.error || "Ação não autorizada.");
  }
  async function classifyItem(item: KnowledgeItem) {
    setBusyItem(item.id); setActionMessage("");
    try {
      await authorize("CLASSIFY", item.id);
      const vaultSourceId = item.provenance.sourceType === "VAULT_ITEM" && item.id.startsWith("vault:") ? item.id.slice("vault:".length) : null;
      if (vaultSourceId && (!vaultLoaded || !vaultItems.some((source) => source.id === vaultSourceId))) {
        throw new Error("Aguarde o Vault carregar a fonte antes de corrigir sua classificação.");
      }
      const classified = applyKnowledgeClassification(item, { primaryDomain: classificationTargets[item.id] || item.primaryDomain });
      const patch = { primaryDomain: classified.primaryDomain, categories: classified.categories, tags: classified.tags, classification: classified.classification };
      const response = await fetch("/api/knowledge/update", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, patch }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível persistir a classificação compartilhada.");
      const updated = await updateKnowledge(item.id, "system", patch);
      if (vaultSourceId) {
          updateVaultItem(vaultSourceId, {
            knowledgeDomains: [classified.primaryDomain, ...classified.relatedDomains],
            knowledgeCategories: classified.categories,
            knowledgeTags: classified.tags,
            classificationSource: "manual",
            classificationConfidence: 1,
            classificationReviewedAt: classified.classification?.classifiedAt,
          });
      }
      setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...updated, content: item.content } : candidate));
      setActionMessage("Classificação salva.");
    } catch (error) { setActionMessage(error instanceof Error ? error.message : "Falha ao classificar."); }
    finally { setBusyItem(null); }
  }
  async function publishItem(item: KnowledgeItem) {
    setBusyItem(item.id); setActionMessage("");
    try {
      await authorize("PUBLISH", item.id);
      const response = await fetch("/api/knowledge/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível persistir a publicação entre agentes.");
      const published = await publishKnowledge(item.id, "system");
      setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...published, content: item.content } : candidate));
      setActionMessage("Conhecimento publicado entre agentes.");
    } catch (error) { setActionMessage(error instanceof Error ? error.message : "Falha ao publicar."); }
    finally { setBusyItem(null); }
  }
  async function revokeItem(item: KnowledgeItem) {
    if (!window.confirm(`Revogar “${item.title}” do retrieval? O registro e a provenance serão preservados.`)) return;
    setBusyItem(item.id); setActionMessage("");
    try {
      await authorize("REVOKE", item.id);
      const response = await fetch(`/api/knowledge/publish?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível persistir a revogação entre agentes.");
      await revokeKnowledge(item.id);
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setActionMessage("Conhecimento revogado do retrieval.");
    } catch (error) { setActionMessage(error instanceof Error ? error.message : "Falha ao revogar."); }
    finally { setBusyItem(null); }
  }
  async function setItemLifecycle(item: KnowledgeItem, nextState: KnowledgeLifecycleState) {
    if (!canManageDomains || nextState === (item.lifecycleState || "ACTIVE")) return;
    setBusyItem(item.id); setActionMessage("");
    try {
      await authorize("LIFECYCLE", item.id);
      const response = await fetch("/api/knowledge/update", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, patch: { lifecycleState: nextState } }) });
      const result = await response.json().catch(() => ({})) as { error?: string; item?: KnowledgeItem };
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar o lifecycle do conhecimento.");
      let updated = result.item || { ...item, lifecycleState: nextState };
      try { updated = await updateKnowledge(item.id, "system", { lifecycleState: nextState }); }
      catch (error) {
        if (!(error instanceof Error) || !error.message.includes("KNOWLEDGE_NOT_FOUND")) throw error;
        updated = await storeKnowledge(updated);
      }
      const refreshedItems = await queryKnowledge({ requester: "athena", query, domain: domain || undefined, purpose: "knowledge center lifecycle refresh", scope: "ALL" });
      setItems(refreshedItems);
      const inventoryResponse = await fetch("/api/knowledge/items?view=lifecycle", { cache: "no-store" });
      const inventory = await inventoryResponse.json().catch(() => ({})) as { items?: KnowledgeItem[] };
      if (inventoryResponse.ok && Array.isArray(inventory.items)) setLifecycleItems(inventory.items);
      setActionMessage(`Estado de ${item.title} atualizado para ${nextState}.`);
    } catch (error) { setActionMessage(error instanceof Error ? error.message : "Falha ao atualizar lifecycle."); }
    finally { setBusyItem(null); }
  }
  async function transferDomainOwner(entry: DomainDefinition) {
    const nextOwner = ownerTargets[entry.id]?.trim();
    if (!nextOwner || nextOwner === entry.primaryOwner) { setDomainMessage("Informe um novo identificador de agente diferente do owner atual."); return; }
    if (!window.confirm(`Transferir ${entry.id} de ${entry.primaryOwner || "sem owner"} para ${nextOwner}? O owner anterior deixa de ter acesso implícito e permanece no histórico.`)) return;
    setBusyDomain(entry.id); setDomainMessage("");
    try {
      const response = await fetch("/api/knowledge/domains", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "TRANSFER_OWNER", domainId: entry.id, agentId: nextOwner, expectedRevision: domainRevision }) });
      const result = await response.json().catch(() => ({})) as { domains?: DomainDefinition[]; revision?: number; persistenceMode?: string; error?: string };
      if (!response.ok || !Array.isArray(result.domains)) throw new Error(result.error || "Falha ao transferir ownership.");
      domainRegistry.replaceDomains(result.domains);
      setDomains(result.domains);
      setDomainRevision(result.revision || domainRevision + 1);
      setDomainPersistence(result.persistenceMode || domainPersistence);
      setOwnerTargets((current) => ({ ...current, [entry.id]: "" }));
      setDomainMessage(`Ownership de ${entry.id} transferido para ${nextOwner}.`);
    } catch (error) { setDomainMessage(error instanceof Error ? error.message : "Falha ao transferir ownership."); }
    finally { setBusyDomain(null); }
  }
  async function changeDomainCoOwner(entry: DomainDefinition, operation: "REGISTER_CO_OWNER" | "REMOVE_CO_OWNER", requestedAgent?: string) {
    const agentId = (requestedAgent || coOwnerTargets[entry.id] || "").trim();
    if (!agentId) { setDomainMessage("Informe o identificador do agente co-responsável."); return; }
    if (operation === "REMOVE_CO_OWNER" && !window.confirm(`Remover ${agentId} como co-responsável de ${entry.id}?`)) return;
    setBusyDomain(entry.id); setDomainMessage("");
    try {
      const response = await fetch("/api/knowledge/domains", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation, domainId: entry.id, agentId, expectedRevision: domainRevision }) });
      const result = await response.json().catch(() => ({})) as { domains?: DomainDefinition[]; revision?: number; persistenceMode?: string; error?: string };
      if (!response.ok || !Array.isArray(result.domains)) throw new Error(result.error || "Falha ao atualizar co-ownership.");
      domainRegistry.replaceDomains(result.domains);
      setDomains(result.domains);
      setDomainRevision(result.revision || domainRevision + 1);
      setDomainPersistence(result.persistenceMode || domainPersistence);
      if (operation === "REGISTER_CO_OWNER") setCoOwnerTargets((current) => ({ ...current, [entry.id]: "" }));
      setDomainMessage(operation === "REGISTER_CO_OWNER" ? `${agentId} agora é co-responsável por ${entry.id}.` : `${agentId} removido da co-responsabilidade de ${entry.id}.`);
    } catch (error) { setDomainMessage(error instanceof Error ? error.message : "Falha ao atualizar co-ownership."); }
    finally { setBusyDomain(null); }
  }
  async function saveDomainRouting(entry: DomainDefinition) {
    const terms = (routingTermTargets[entry.id] ?? entry.routingTerms?.join(", ") ?? "").split(/[\n,;]/u).map((term) => term.trim()).filter(Boolean);
    const priorityText = routingPriorityTargets[entry.id] ?? String(entry.routingPriority || 0);
    const priority = Number(priorityText);
    if (!Number.isInteger(priority) || priority < -1000 || priority > 1000) { setDomainMessage("A prioridade de rota deve ser um inteiro entre -1000 e 1000."); return; }
    setBusyDomain(entry.id); setDomainMessage("");
    try {
      const response = await fetch("/api/knowledge/domains", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "UPDATE_ROUTING", domainId: entry.id, routingTerms: terms, routingPriority: priority, expectedRevision: domainRevision }) });
      const result = await response.json().catch(() => ({})) as { domains?: DomainDefinition[]; revision?: number; persistenceMode?: string; error?: string };
      if (!response.ok || !Array.isArray(result.domains)) throw new Error(result.error || "Falha ao atualizar termos do roteador.");
      domainRegistry.replaceDomains(result.domains);
      setDomains(result.domains);
      setDomainRevision(result.revision || domainRevision + 1);
      setDomainPersistence(result.persistenceMode || domainPersistence);
      setRoutingTermTargets((current) => ({ ...current, [entry.id]: terms.join(", ") }));
      setDomainMessage(`Termos de roteamento atualizados para ${entry.id}.`);
    } catch (error) { setDomainMessage(error instanceof Error ? error.message : "Falha ao atualizar termos de roteamento."); }
    finally { setBusyDomain(null); }
  }
  async function changeDomainBridge(entry: DomainDefinition, operation: "REGISTER_DOMAIN_BRIDGE" | "REMOVE_DOMAIN_BRIDGE", bridgeId?: string) {
    const target = bridgeTargets["__new"] || bridgeTargets[entry.id] || { domain: "", concepts: "", description: "" };
    const endpoints = operation === "REGISTER_DOMAIN_BRIDGE" ? [target.domain.trim(), target.related?.trim() || ""].sort() : [entry.id, target.domain.trim()].sort();
    const bridge = { id: `${endpoints[0]}-${endpoints[1]}`.replace(/[^a-z0-9.-]+/gu, "-"), domains: endpoints, concepts: target.concepts.split(/[,;\n]/u).map((term) => term.trim()).filter(Boolean), description: target.description.trim(), enabled: true };
    if (operation === "REGISTER_DOMAIN_BRIDGE" && (endpoints.some((endpoint) => !endpoint) || endpoints[0] === endpoints[1] || !bridge.concepts.length || !bridge.description)) { setDomainMessage("Informe dois domínios distintos, conceitos e justificativa semântica do bridge."); return; }
    if (operation === "REMOVE_DOMAIN_BRIDGE" && !window.confirm(`Remover o DomainBridge ${bridgeId} de ${entry.id}?`)) return;
    setBusyDomain(entry.id); setDomainMessage("");
    try {
      const response = await fetch("/api/knowledge/domains", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation, domainId: entry.id, bridge, bridgeId, expectedRevision: domainRevision }) });
      const result = await response.json().catch(() => ({})) as { domains?: DomainDefinition[]; revision?: number; persistenceMode?: string; error?: string };
      if (!response.ok || !Array.isArray(result.domains)) throw new Error(result.error || "Falha ao atualizar DomainBridge.");
      domainRegistry.replaceDomains(result.domains); setDomains(result.domains); setDomainRevision(result.revision || domainRevision + 1); setDomainPersistence(result.persistenceMode || domainPersistence);
      if (operation === "REGISTER_DOMAIN_BRIDGE") setBridgeTargets((current) => ({ ...current, "__new": { domain: "", related: "", concepts: "", description: "" } }));
      setDomainMessage(operation === "REGISTER_DOMAIN_BRIDGE" ? `DomainBridge registrado entre ${endpoints.join(" e ")}.` : `DomainBridge ${bridgeId} removido.`);
    } catch (error) { setDomainMessage(error instanceof Error ? error.message : "Falha ao atualizar DomainBridge."); }
    finally { setBusyDomain(null); }
  }
  const publicCount = items.filter((item) => item.visibility === "PUBLIC_TO_AGENTS").length;
  const taxonomy = useMemo(() => buildKnowledgeTaxonomy(domains, items), [domains, items]);
  return <PageLayout title="Knowledge" subtitle="Mapa de domínios, autoridade e conhecimento compartilhável">
    <main className="p-6 space-y-6 animate-fade-in">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Domínios', domains.length], ['Itens locais', items.length], ['Públicos entre agentes', publicCount], ['Consultas auditadas', accessCount]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>)}
      </section>
      <KnowledgeTaxonomyTree roots={taxonomy.roots} unmappedItemCount={taxonomy.unmappedItemCount} selectedDomain={domain} onSelect={setDomain} />
      <KnowledgeLifecycleControl items={lifecycleItems} canManage={canManageDomains} busyItem={busyItem} onChange={(item, state) => void setItemLifecycle(item, state)} />
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Domain Registry</h2><p className="mt-1 text-xs text-slate-500">Athena conhece o mapa; o conteúdo continua protegido por policy.</p></div><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-400">Registry: {domainPersistence} · Knowledge: {knowledgePersistence}</span></div>
        {domainMessage && <p role="status" className="mt-3 text-xs text-violet-200">{domainMessage}</p>}
        <p className="mt-2 text-[10px] text-slate-500">DomainBridges descrevem conceitos interdisciplinares para roteamento; não concedem acesso ao conteúdo.</p>
        {canManageDomains && <div className="mt-3 grid gap-2 rounded border border-cyan-500/15 p-3 md:grid-cols-4"><select aria-label="Domínio A do novo bridge" value={bridgeTargets["__new"]?.domain || ""} onChange={(event) => setBridgeTargets((current) => ({ ...current, __new: { ...(current.__new || { domain: "", concepts: "", description: "" }), domain: event.target.value } }))} className="rounded border border-white/10 bg-black/30 px-2 py-2 text-[10px] text-white"><option value="">Domínio A</option>{domains.map((entry) => <option key={entry.id} value={entry.id}>{entry.id}</option>)}</select><select aria-label="Domínio B do novo bridge" value={bridgeTargets["__new"]?.related || ""} onChange={(event) => setBridgeTargets((current) => ({ ...current, __new: { ...(current.__new || { domain: "", concepts: "", description: "" }), related: event.target.value } }))} className="rounded border border-white/10 bg-black/30 px-2 py-2 text-[10px] text-white"><option value="">Domínio B</option>{domains.map((entry) => <option key={entry.id} value={entry.id}>{entry.id}</option>)}</select><input aria-label="Conceitos do novo bridge" value={bridgeTargets["__new"]?.concepts || ""} onChange={(event) => setBridgeTargets((current) => ({ ...current, __new: { ...(current.__new || { domain: "", concepts: "", description: "" }), concepts: event.target.value } }))} placeholder="conceitos, separados por vírgula" className="rounded border border-white/10 bg-black/30 px-2 py-2 text-[10px] text-white" /><div className="flex gap-2"><input aria-label="Justificativa do novo bridge" value={bridgeTargets["__new"]?.description || ""} onChange={(event) => setBridgeTargets((current) => ({ ...current, __new: { ...(current.__new || { domain: "", concepts: "", description: "" }), description: event.target.value } }))} placeholder="justificativa semântica" className="min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 py-2 text-[10px] text-white" /><button type="button" disabled={Boolean(busyDomain)} onClick={() => { const selected = bridgeTargets["__new"]; if (!selected?.domain || !selected.related || selected.domain === selected.related) { setDomainMessage("Escolha dois domínios diferentes para criar o bridge."); return; } const anchor = domains.find((entry) => entry.id === selected.domain)!; void changeDomainBridge(anchor, "REGISTER_DOMAIN_BRIDGE"); }} className="rounded border border-cyan-500/30 px-3 py-2 text-[10px] text-cyan-100 disabled:opacity-50">Adicionar bridge</button></div></div>}
        {domains.some((entry) => entry.bridges?.length) && <div className="mt-3 space-y-2">{domains.flatMap((entry) => (entry.bridges || []).map((bridge) => ({ entry, bridge }))).map(({ entry, bridge }) => <div key={bridge.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-cyan-500/15 bg-cyan-500/[0.03] px-3 py-2 text-[10px] text-cyan-100"><span><span className="font-mono">{bridge.domains.join(" ↔ ")}</span> · {bridge.concepts.join(" · ")}<span className="ml-2 text-slate-400">{bridge.description}</span></span>{canManageDomains && <button type="button" aria-label={`Remover DomainBridge ${bridge.id}`} disabled={busyDomain === entry.id} onClick={() => void changeDomainBridge(entry, "REMOVE_DOMAIN_BRIDGE", bridge.id)} className="text-rose-300 disabled:opacity-50">Remover</button>}</div>)}</div>}
        <div className="mt-4 grid gap-3 md:grid-cols-2">{domains.map((entry) => <article key={entry.id} className="rounded-lg border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm text-violet-200">{entry.label}</h3><p className="mt-1 font-mono text-[10px] text-slate-500">{entry.id}{entry.parentId ? ` · pai ${entry.parentId}` : ""}</p></div><span className="rounded-full border border-emerald-500/30 px-2 py-1 text-[10px] text-emerald-300">Owner primário: {entry.primaryOwner || "não definido"}</span></div><div className="mt-3 flex flex-wrap gap-2">{entry.coOwners?.map((coOwner) => <span key={`co-owner:${coOwner}`} className="inline-flex items-center gap-1 rounded border border-cyan-500/20 px-2 py-1 text-[10px] text-cyan-200">Co-owner · {coOwner}{canManageDomains && <button type="button" aria-label={`Remover co-owner ${coOwner} de ${entry.id}`} disabled={busyDomain === entry.id} onClick={() => void changeDomainCoOwner(entry, "REMOVE_CO_OWNER", coOwner)} className="ml-1 text-rose-300 disabled:opacity-50">×</button>}</span>)}{entry.specialists.filter((specialist) => specialist !== entry.primaryOwner && !entry.coOwners?.includes(specialist)).map((specialist) => <span key={specialist} className="rounded border border-white/10 px-2 py-1 text-[10px] text-slate-400">Especialista · {specialist}</span>)}{entry.capabilities.map((capability) => <span key={capability} className="rounded border border-violet-500/20 px-2 py-1 text-[10px] text-violet-200">{capability}</span>)}</div><p className="mt-2 text-[10px] text-slate-500">Termos de roteamento: {entry.routingTerms?.length ? entry.routingTerms.join(" · ") : "não configurados"} · prioridade {entry.routingPriority || 0}</p><div className="mt-3 rounded border border-emerald-500/15 bg-emerald-500/[0.03] p-2"><p className="text-[9px] uppercase tracking-wider text-emerald-300">Compartilhadas explicitamente entre agentes</p><div className="mt-2 flex flex-wrap gap-2">{entry.publicCapabilities?.length ? entry.publicCapabilities.map((capability) => <span key={capability.id} title={`${capability.description} · consumidores: ${capability.allowedConsumers.join(", ")}`} className="rounded border border-emerald-500/25 px-2 py-1 text-[10px] text-emerald-200">{capability.id} · {capability.allowedConsumers.includes("*") ? "todos os agentes" : capability.allowedConsumers.join(", ")}</span>) : <span className="text-[10px] text-slate-500">Nenhuma capability publicada</span>}</div></div>{entry.ownershipHistory?.length ? <p className="mt-3 text-[10px] text-slate-500">Transferências anteriores: {entry.ownershipHistory.map((record) => `${record.agentId} (${new Date(record.transferredAt).toLocaleDateString()})`).join(" · ")}</p> : null}{canManageDomains && <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3"><input aria-label={`Novo owner para ${entry.id}`} value={ownerTargets[entry.id] || ""} onChange={(event) => setOwnerTargets((current) => ({ ...current, [entry.id]: event.target.value }))} placeholder="id do agente responsável" className="min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white" /><button type="button" disabled={busyDomain === entry.id} onClick={() => void transferDomainOwner(entry)} className="rounded border border-amber-500/30 px-2 py-1 text-[10px] text-amber-200 disabled:opacity-50">Transferir ownership</button><input aria-label={`Novo co-owner para ${entry.id}`} value={coOwnerTargets[entry.id] || ""} onChange={(event) => setCoOwnerTargets((current) => ({ ...current, [entry.id]: event.target.value }))} placeholder="id do co-owner" className="min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white" /><button type="button" disabled={busyDomain === entry.id} onClick={() => void changeDomainCoOwner(entry, "REGISTER_CO_OWNER")} className="rounded border border-cyan-500/30 px-2 py-1 text-[10px] text-cyan-200 disabled:opacity-50">Adicionar co-owner</button><input aria-label={`Termos de roteamento para ${entry.id}`} value={routingTermTargets[entry.id] ?? entry.routingTerms?.join(", ") ?? ""} onChange={(event) => setRoutingTermTargets((current) => ({ ...current, [entry.id]: event.target.value }))} placeholder="termos, separados por vírgula" className="min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white" /><input aria-label={`Prioridade de roteamento para ${entry.id}`} type="number" min={-1000} max={1000} value={routingPriorityTargets[entry.id] ?? String(entry.routingPriority || 0)} onChange={(event) => setRoutingPriorityTargets((current) => ({ ...current, [entry.id]: event.target.value }))} className="w-20 rounded border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white" /><button type="button" disabled={busyDomain === entry.id} onClick={() => void saveDomainRouting(entry)} className="rounded border border-violet-500/30 px-2 py-1 text-[10px] text-violet-200 disabled:opacity-50">Salvar roteamento</button></div>}</article>)}</div>
      </section>
      <section className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-amber-100">Conflitos preservados</h2><p className="mt-1 text-xs text-slate-500">Fontes divergentes permanecem disponíveis para revisão do especialista.</p></div><span className="rounded-full border border-amber-500/30 px-2 py-1 text-[10px] text-amber-300">{conflicts.length} grupos</span></div><div className="mt-4 space-y-2">{conflicts.length === 0 ? <p className="text-xs text-slate-500">Nenhum conflito detectado.</p> : conflicts.map((conflict) => <div key={conflict.groupId} className="rounded-lg border border-amber-500/20 px-3 py-2 text-xs text-slate-300">{conflict.items.length} fontes no grupo <span className="font-mono text-[10px] text-amber-300">{conflict.groupId}</span></div>)}</div></section>
      <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-cyan-100">Relationships</h2><p className="mt-1 text-xs text-slate-500">Relações persistidas do grafo lógico, sem expor conteúdo fora da policy.</p></div><span className="rounded-full border border-cyan-500/30 px-2 py-1 text-[10px] text-cyan-300">{relationships.length}</span></div><div className="mt-4 space-y-2">{relationships.length === 0 ? <p className="text-xs text-slate-500">Nenhuma relação registrada.</p> : relationships.slice(0, 12).map((relationship) => <div key={relationship.id} className="rounded-lg border border-cyan-500/20 px-3 py-2 text-xs text-slate-300"><span className="font-mono text-cyan-200">{relationship.fromId}</span><span className="mx-2 text-slate-500">{relationship.type}</span><span className="font-mono text-cyan-200">{relationship.toId}</span></div>)}</div></section>
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-sm font-semibold text-white">Knowledge Items</h2><div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar conhecimento..." className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-violet-400" /><select value={domain} onChange={(event) => setDomain(event.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-xs text-slate-300"><option value="">Todos os domínios</option>{domains.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></div></div>{actionMessage && <p role="status" className="mt-3 text-xs text-violet-200">{actionMessage}</p>}<div className="mt-4 space-y-2">{items.length === 0 ? <p className="text-xs text-slate-500">Nenhum item autorizado foi encontrado. O Vault continua funcionando normalmente.</p> : items.map((item) => <details key={item.id} className="group rounded-lg border border-white/10 px-3 py-2"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span className="text-xs text-slate-200">{item.title}</span><span className="text-right text-[10px] text-slate-500">{item.primaryDomain} · {item.visibility} · v{item.version}</span></summary><div className="mt-3 grid gap-3 border-t border-white/10 pt-3 text-[11px] md:grid-cols-2"><div><p className="text-slate-400">Domínio e owner</p><p className="mt-1 text-slate-200">{item.primaryDomain}{item.relatedDomains.length ? ` · ${item.relatedDomains.join(", ")}` : ""} · {item.ownerAgent || "sem owner"}</p></div><div><p className="text-slate-400">Origem e autoridade</p><p className="mt-1 text-slate-200">{item.provenance.sourceType} · {item.provenance.authority}{item.provenance.sourceReference ? ` · ${item.provenance.sourceReference}` : ""}</p></div><div><p className="text-slate-400">Freshness e assertion</p><p className="mt-1 text-slate-200">{item.freshness} · {item.assertion}{item.validUntil ? ` · válido até ${new Date(item.validUntil).toLocaleDateString()}` : ""}</p></div><div><p className="text-slate-400">Categorias e projetos</p><p className="mt-1 text-slate-200">{[...item.categories, ...item.tags, ...item.relatedProjectIds].join(" · ") || "sem classificação adicional"}</p></div><div className="md:col-span-2"><p className="text-slate-400">Conteúdo autorizado</p><p className="mt-1 whitespace-pre-wrap text-slate-200">{item.content || "Sem conteúdo textual"}</p></div><div className="flex flex-wrap items-center gap-2 md:col-span-2"><select aria-label={`Reclassificar ${item.title}`} value={classificationTargets[item.id] || item.primaryDomain} onChange={(event) => setClassificationTargets((current) => ({ ...current, [item.id]: event.target.value }))} className="rounded border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-slate-200">{domains.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select><button type="button" disabled={busyItem === item.id} onClick={() => void classifyItem(item)} className="rounded border border-violet-500/30 px-2 py-1 text-[10px] text-violet-200 disabled:opacity-50">Salvar classificação</button>{item.visibility !== "PUBLIC_TO_AGENTS" && <button type="button" disabled={busyItem === item.id} onClick={() => void publishItem(item)} className="rounded border border-emerald-500/30 px-2 py-1 text-[10px] text-emerald-200 disabled:opacity-50">Publicar entre agentes</button>}<button type="button" disabled={busyItem === item.id} onClick={() => void revokeItem(item)} className="rounded border border-rose-500/30 px-2 py-1 text-[10px] text-rose-200 disabled:opacity-50">Revogar do retrieval</button></div></div></details>)}</div></section>
    </main>
  </PageLayout>;
}
