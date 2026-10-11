import type { ExperienceRecord } from "@/lib/experience/contracts";
import { buildProjectExperienceGuidance } from "./project-experience-guidance";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const record = (overrides: Partial<ExperienceRecord> = {}): ExperienceRecord => ({
  id: "project-experience-1",
  domain: "research",
  context: {},
  situation: "A síntese estava ampla demais",
  action: "Delimitar a pergunta antes de selecionar fontes",
  outcome: "A comparação ficou mais verificável",
  confidence: 0.5,
  usefulness: 1,
  evidence: [{ eventId: "event-1", weight: "HIGH", reason: "retrospectiva revisada" }],
  scope: "PROJECT",
  scopeId: "project-a",
  createdAt: new Date(0).toISOString(),
  ...overrides,
});

const base = { records: [record()], projectId: "project-a", currentInstruction: "Proponha caminhos para este projeto" };
const included = buildProjectExperienceGuidance(base);
assert(included.experienceIds[0] === "project-experience-1", "A experiência útil do projeto ativo deve ser selecionada");
assert(included.text.includes("referência, não fato") && included.text.includes("resultado:") && included.text.includes("A comparação ficou"), "O resultado deve ser explicitamente apresentado como referência não factual");

assert(buildProjectExperienceGuidance({ ...base, projectId: "project-b" }).experienceIds.length === 0, "Não pode vazar experiência entre projetos");
assert(buildProjectExperienceGuidance({ ...base, projectId: undefined }).experienceIds.length === 0, "Sem projeto ativo, experiência de projeto não pode ser inferida");
assert(buildProjectExperienceGuidance({ ...base, currentInstruction: "Dê ideias novas sem usar experiências anteriores" }).experienceIds.length === 0, "A instrução atual para ignorar experiências deve prevalecer");
assert(buildProjectExperienceGuidance({ ...base, records: [record({ scope: "GLOBAL", scopeId: undefined })] }).experienceIds.length === 0, "Registros globais não entram nesta integração estritamente por projeto");
assert(buildProjectExperienceGuidance({ ...base, records: [record({ usefulness: 0 })] }).experienceIds.length === 0, "Resultado sem utilidade positiva não deve orientar proposta");
assert(buildProjectExperienceGuidance({ ...base, records: [record({ confidence: 0.25 })] }).experienceIds.length === 0, "Evidência abaixo do limiar não deve orientar proposta");
assert(buildProjectExperienceGuidance({ ...base, records: [record({ evidence: [] })] }).experienceIds.length === 0, "Experiência sem provenance não deve ser consumida");
assert(buildProjectExperienceGuidance({ ...base, limit: 0 }).experienceIds.length === 0, "O limite zero deve suprimir a saída");

console.log("✓ Athena project experience guidance stays useful, evidenced, bounded, and project-isolated");
