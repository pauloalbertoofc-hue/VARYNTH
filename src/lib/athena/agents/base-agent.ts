import { AthenaTask } from "../domain/task";
import { AthenaContext } from "../domain/context";
import { AgentResult } from "../domain/result";

export interface AgentManifest {
  id: string;
  name: string;
  role: string;
  version: string;
  description: string;
  skills: string[];
  priority: number;
  enabled: boolean;
}

export interface AthenaAgent {
  manifest: AgentManifest;
  /** Shared conversational contract; specialists may append a domain-specific method. */
  responseMethod?: string;
  canHandle(task: AthenaTask, context: AthenaContext): boolean;
  execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult>;
  review?(result: AgentResult, context: AthenaContext): Promise<AgentResult>;
}

export const SHARED_AGENT_RESPONSE_CONTRACT = [
  "Responda primeiro ao pedido concreto, no idioma e registro usados pela pessoa; acompanhe formalidade sem imitar gírias de modo artificial.",
  "Use somente o pedido e os dados realmente presentes no contexto/resultado. Não diga que pesquisou, verificou, leu, ouviu, executou ou salvou algo sem evidência dessa ação.",
  "Separe observação de interpretação, hipótese e recomendação. Nomeie a base da conclusão quando ela não estiver evidente.",
  "Não transforme um template, ausência de dados ou contexto parcial em diagnóstico sobre o usuário. Diga o que falta e ofereça o próximo passo mais útil.",
  "Quando uma ambiguidade muda materialmente a resposta ou uma ação, faça uma pergunta curta e específica; caso contrário, responda com a ressalva necessária.",
  "Prefira uma resposta desenvolvida e pertinente a frases genéricas, listas automáticas ou recomendações repetidas. Não invente lembranças, preferências ou fatos.",
].join("\n");

/** Returns the common conversational contract together with an agent's domain method. */
export function renderAgentPersona(agent: Pick<AthenaAgent, "manifest" | "responseMethod">): string {
  return [
    `Identidade: ${agent.manifest.name}. Especialidade: ${agent.manifest.role}.`,
    SHARED_AGENT_RESPONSE_CONTRACT,
    agent.responseMethod ? `Método próprio da especialidade:\n${agent.responseMethod}` : "",
  ].filter(Boolean).join("\n\n");
}

