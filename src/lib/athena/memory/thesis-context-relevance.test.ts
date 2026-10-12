import assert from "node:assert/strict";
import type { ArgumentThesis } from "@/lib/types/codex";
import type { AthenaEngineContext } from "../engine";
import type { AthenaTask } from "../domain/task";
import { ContextBuilder } from "./context-builder";
import { selectRelevantTheses } from "./thesis-context-relevance";

const theses: ArgumentThesis[] = [
  { id: "civil", title: "Responsabilidade civil digital", area: "Direito Civil", question: "Quem responde por danos em plataforma?", pros: [], cons: [], precedents: [], doctrine: [], counterArguments: [], conclusion: "", tags: ["plataforma", "danos"], status: "consolidada", createdAt: "", updatedAt: "" },
  { id: "labor", title: "Jornada em teletrabalho", area: "Direito do Trabalho", question: "Como registrar horas remotas?", pros: [], cons: [], precedents: [], doctrine: [], counterArguments: [], conclusion: "", tags: ["jornada", "remoto"], status: "em_elaboracao", createdAt: "", updatedAt: "" },
];

assert.deepEqual(selectRelevantTheses(theses, "Analise a tese de responsabilidade civil digital").map((thesis) => thesis.id), ["civil"]);
assert.deepEqual(selectRelevantTheses(theses, "Qual é a capital da França?"), [], "an unrelated question must not inherit the first stored legal thesis");
assert.deepEqual(selectRelevantTheses(theses, "Analise a tese registrada").map((thesis) => thesis.id), ["civil", "labor"], "a generic request with multiple theses must return candidates for disambiguation rather than selecting by order");

const builder = new ContextBuilder();
const store = { projects: [], tasks: [], vaultItems: [], chronosEvents: [], theses, evidences: [], opportunities: [] } as unknown as AthenaEngineContext;
const legalTask = { rawPrompt: "Analise a tese de responsabilidade civil digital", entities: {} } as AthenaTask;
assert.deepEqual(builder.buildContext(legalTask, "juridico", store).relevantTheses.map((thesis) => thesis.id), ["civil"]);
const genericTask = { rawPrompt: "Analise a tese registrada", entities: {} } as AthenaTask;
assert.deepEqual(builder.buildContext(genericTask, "juridico", store).relevantTheses.map((thesis) => thesis.id), ["civil", "labor"]);
const unrelatedGeneralTask = { rawPrompt: "Como está o tempo?", entities: {} } as AthenaTask;
assert.deepEqual(builder.buildContext(unrelatedGeneralTask, "geral", store).relevantTheses, [], "general context must not receive arbitrary first theses");

console.log("Legal thesis context selects topical candidates and requires disambiguation instead of storage-order fallback.");
