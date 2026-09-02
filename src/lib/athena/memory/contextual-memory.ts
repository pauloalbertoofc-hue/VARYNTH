import type { AthenaEngineContext } from "../engine";
import type { AthenaMessage, AthenaScope } from "@/lib/types";
import { memoryGate } from "./memory-gate";
import { athenaMemoryManager } from "./memory-manager";

export interface DurableAthenaFact {
  id: string;
  text: string;
  kind: "preferencia" | "decisao" | "diretriz";
  projectId?: string;
  createdAt: string;
  updatedAt?: string;
  source?: "USER_EXPLICIT";
}

interface StateSnapshot {
  capturedAt: string;
  projects: Record<string, string>;
  tasks: Record<string, string>;
  notes: Record<string, string>;
}

interface ConversationCheckpoint {
  sessionId: string;
  userPrompt: string;
  athenaResponse: string;
  projectId?: string;
  timestamp: string;
  snapshot: StateSnapshot;
}

interface ContextualMemoryData {
  facts: DurableAthenaFact[];
  checkpoints: Record<string, ConversationCheckpoint>;
  latest?: ConversationCheckpoint;
}

const STORAGE_KEY = "varynth_athena_contextual_memory_v1";
let fallbackData: ContextualMemoryData = { facts: [], checkpoints: {} };

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

function load(): ContextualMemoryData {
  if (typeof window === "undefined" || !window.localStorage) return clone(fallbackData);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { facts: [], checkpoints: {} };
  } catch { return { facts: [], checkpoints: {} }; }
}

function save(data: ContextualMemoryData): void {
  const bounded = { ...data, facts: data.facts.slice(0, 100), checkpoints: Object.fromEntries(Object.entries(data.checkpoints).slice(-20)) };
  fallbackData = clone(bounded);
  if (typeof window !== "undefined" && window.localStorage) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded)); } catch { /* armazenamento indisponível */ }
  }
}

function snapshot(ctx: AthenaEngineContext): StateSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    projects: Object.fromEntries(ctx.projects.map((p) => [p.id, `${p.title}|${p.status}|${p.priority}|${p.deadline || ""}|${p.updatedAt}`])),
    tasks: Object.fromEntries(ctx.tasks.map((t) => [t.id, `${t.projectId || ""}|${t.title}|${t.status}|${t.priority}|${t.dueDate || ""}|${t.completedAt || ""}`])),
    notes: Object.fromEntries((ctx.notes || []).map((n) => [n.id, `${n.title}|${n.updatedAt}`])),
  };
}

function response(text: string, scope: AthenaScope): AthenaMessage {
  return { id: `ath-memory-${Date.now()}`, sender: "athena", text, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), scope, metadata: { engine: "deterministic-contextual-memory" } };
}

function compact(value: string, limit = 180): string {
  const clean = value.replace(/[*#]/g, "").replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean;
}

function diff(previous: StateSnapshot, current: StateSnapshot, ctx: AthenaEngineContext, projectId?: string): string[] {
  const changes: string[] = [];
  const allowedProject = (id?: string) => !projectId || id === projectId;
  for (const project of ctx.projects) {
    if (!allowedProject(project.id)) continue;
    if (!previous.projects[project.id]) changes.push(`Novo projeto: **${project.title}**`);
    else if (previous.projects[project.id] !== current.projects[project.id]) changes.push(`Projeto atualizado: **${project.title}** — ${project.status.replaceAll("_", " ")}, prioridade ${project.priority}${project.deadline ? `, prazo ${project.deadline}` : ""}`);
  }
  for (const id of Object.keys(previous.projects)) if (!current.projects[id] && (!projectId || id === projectId)) changes.push(`Projeto removido da área ativa: **${previous.projects[id].split("|")[0]}**`);
  for (const task of ctx.tasks) {
    if (!allowedProject(task.projectId)) continue;
    if (!previous.tasks[task.id]) changes.push(`Nova tarefa: **${task.title}**`);
    else if (previous.tasks[task.id] !== current.tasks[task.id]) changes.push(`Tarefa atualizada: **${task.title}** — ${task.status.replaceAll("_", " ")}, prioridade ${task.priority}`);
  }
  for (const id of Object.keys(previous.tasks)) {
    if (current.tasks[id]) continue;
    const [previousProjectId, previousTitle] = previous.tasks[id].split("|");
    if (allowedProject(previousProjectId || undefined)) changes.push(`Tarefa removida: **${previousTitle}**`);
  }
  for (const note of ctx.notes || []) {
    if (!allowedProject(note.projectId)) continue;
    if (!previous.notes[note.id]) changes.push(`Nova nota: **${note.title}**`);
    else if (previous.notes[note.id] !== current.notes[note.id]) changes.push(`Nota atualizada: **${note.title}**`);
  }
  return changes.slice(0, 12);
}

function extractFact(prompt: string): { text: string; kind: DurableAthenaFact["kind"] } | undefined {
  const clean = normalize(prompt);
  let kind: DurableAthenaFact["kind"] = "diretriz";
  if (clean.includes("prefiro") || clean.includes("minha preferencia")) kind = "preferencia";
  if (clean.includes("decidimos") || clean.includes("a decisao e") || clean.includes("a decisao foi")) kind = "decisao";
  const patterns = [
    /^(?:athena[, :]*)?(?:lembre|lembre-se|guarde|memorize)(?: que| disto| disso)?\s*[:,-]?\s*/i,
    /^(?:athena[, :]*)?(?:minha preferência é|minha preferencia e|eu prefiro)\s*/i,
    /^(?:athena[, :]*)?(?:decidimos que|a decisão é|a decisao e|a decisão foi|a decisao foi)\s*/i,
  ];
  const pattern = patterns.find((candidate) => candidate.test(prompt));
  if (!pattern) return undefined;
  const text = prompt.replace(pattern, "").replace(/[.!]+$/, "").trim();
  return text.length >= 4 ? { text, kind } : undefined;
}

export class AthenaContextualMemory {
  recordInteraction(userPrompt: string, athenaResponse: string, ctx: AthenaEngineContext, sessionId: string, projectId?: string): void {
    const data = load();
    const clean = normalize(userPrompt);
    const existing = data.checkpoints[sessionId] || data.latest;
    const isContinuation = /^(continue|continuar|retome|retomar|prossiga)\b/.test(clean);
    const isRecall = clean.includes("o que voce lembra") || clean.includes("o que esta na sua memoria") || clean.includes("minhas preferencias") || clean.includes("decisoes registradas");
    if ((isContinuation || isRecall || Boolean(extractFact(userPrompt))) && existing) return;
    if ((clean.includes("o que mudou desde") || clean.includes("novidades desde a ultima")) && existing) {
      const refreshed = { ...existing, timestamp: new Date().toISOString(), snapshot: snapshot(ctx) };
      data.checkpoints[sessionId] = refreshed;
      data.latest = refreshed;
      save(data);
      return;
    }
    const checkpoint: ConversationCheckpoint = { sessionId, userPrompt: compact(userPrompt, 240), athenaResponse: compact(athenaResponse, 400), projectId, timestamp: new Date().toISOString(), snapshot: snapshot(ctx) };
    data.checkpoints[sessionId] = checkpoint;
    data.latest = checkpoint;
    save(data);
  }

  getFacts(projectId?: string): DurableAthenaFact[] { return load().facts.filter((fact) => !projectId || !fact.projectId || fact.projectId === projectId); }

  updateFact(id: string, text: string): DurableAthenaFact | undefined {
    const clean = text.trim();
    if (clean.length < 4) return undefined;
    const data = load();
    const index = data.facts.findIndex((fact) => fact.id === id);
    if (index < 0) return undefined;
    data.facts[index] = { ...data.facts[index], text: clean, updatedAt: new Date().toISOString() };
    save(data);
    return clone(data.facts[index]);
  }

  deleteFact(id: string): boolean {
    const data = load();
    const next = data.facts.filter((fact) => fact.id !== id);
    if (next.length === data.facts.length) return false;
    data.facts = next;
    save(data);
    return true;
  }

  clearForTests(): void {
    fallbackData = { facts: [], checkpoints: {} };
    if (typeof window !== "undefined" && window.localStorage) localStorage.removeItem(STORAGE_KEY);
  }

  tryHandle(prompt: string, scope: AthenaScope, ctx: AthenaEngineContext, projectId?: string, sessionId = "default-session"): AthenaMessage | undefined {
    const clean = normalize(prompt);
    const explicitFact = extractFact(prompt);
    if (explicitFact) {
      const decision = memoryGate.evaluate({ title: explicitFact.kind, content: explicitFact.text, scope, projectId, confidence: "HIGH", sourceType: "USER_EXPLICIT" });
      if (!decision.accepted) return response(`Não registrei essa informação: ${decision.reason}`, scope);
      const data = load();
      const duplicate = data.facts.some((fact) => normalize(fact.text) === normalize(explicitFact.text) && fact.projectId === projectId);
      if (!duplicate) {
        data.facts.unshift({ id: `fact-${Date.now()}`, text: explicitFact.text, kind: explicitFact.kind, projectId, createdAt: new Date().toISOString(), source: "USER_EXPLICIT" });
        save(data);
        athenaMemoryManager.recordEpisode(`${explicitFact.kind}: ${explicitFact.text}`, scope);
      }
      return response(`${duplicate ? "Isso já estava registrado" : "Registrei"} como **${explicitFact.kind}**${projectId ? " deste projeto" : ""}: **${explicitFact.text}**. Essa memória fica somente no armazenamento local do VARYNTH.`, scope);
    }
    if (clean.includes("o que voce lembra") || clean.includes("o que esta na sua memoria") || clean.includes("minhas preferencias") || clean.includes("decisoes registradas")) {
      const facts = this.getFacts(projectId);
      if (!facts.length) return response("Ainda não há preferências, decisões ou diretrizes explícitas registradas neste contexto.", scope);
      return response(`Tenho **${facts.length} ${facts.length === 1 ? "memória explícita" : "memórias explícitas"}** neste contexto:\n\n${facts.slice(0, 10).map((fact, index) => `${index + 1}. **${fact.kind}:** ${fact.text}`).join("\n")}`, scope);
    }
    if (clean.includes("o que mudou desde") || clean.includes("mudou desde nossa ultima") || clean.includes("novidades desde a ultima")) {
      const data = load();
      const checkpoint = data.checkpoints[sessionId] || data.latest;
      if (!checkpoint) return response("Ainda não tenho um ponto de comparação salvo. A partir desta conversa, registrarei um checkpoint local para comparar mudanças futuras.", scope);
      const changes = diff(checkpoint.snapshot, snapshot(ctx), ctx, projectId);
      if (!changes.length) return response(`Desde nossa última conversa registrada em **${new Date(checkpoint.timestamp).toLocaleString("pt-BR")}**, não detectei mudanças em projetos, tarefas ou notas${projectId ? " deste projeto" : ""}.`, scope);
      return response(`Desde nossa última conversa, detectei **${changes.length} ${changes.length === 1 ? "mudança" : "mudanças"}**:\n\n${changes.map((change) => `- ${change}`).join("\n")}`, scope);
    }
    if (/^(continue|continuar|retome|retomar|prossiga)( de onde paramos| de onde parei| nossa conversa)?[.!?]*$/.test(clean)) {
      const data = load();
      const checkpoint = data.checkpoints[sessionId] || data.latest;
      if (!checkpoint) return response("Ainda não tenho uma conversa anterior persistida para retomar. Diga o tema e eu começo a acompanhá-lo a partir de agora.", scope);
      const project = checkpoint.projectId ? ctx.projects.find((p) => p.id === checkpoint.projectId) : undefined;
      return response(`Retomando de onde paramos${project ? ` em **${project.title}**` : ""}:\n\n- Você pediu: **${checkpoint.userPrompt}**\n- Minha última resposta: ${checkpoint.athenaResponse}\n\nPosso aprofundar esse ponto ou executar a próxima ação que você indicar.`, scope);
    }
    return undefined;
  }
}

export const athenaContextualMemory = new AthenaContextualMemory();
