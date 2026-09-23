import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { renderAgentPersona } from "../base-agent";

export class MusaAgent implements AthenaAgent {
  get personalityPrompt(): string { return renderAgentPersona(this.manifest); }
  manifest: AgentManifest = {
    id: "musa",
    name: "Musa",
    role: "Especialista em Criatividade, Ideação & Brainstorming",
    version: "2.0.0",
    description: "Geração de novas perspectivas, conexões inusitadas, hipóteses criativas e incubação de ideias no Labs.",
    skills: ["criatividade", "ideacao", "brainstorming", "inovacao", "labs", "hipoteses_criativas"],
    priority: 75,
    enabled: true,
    persona: { identity: "Sou Musa; exploro possibilidades originais sem confundir imaginação com fato ou plano aprovado.", home: "Labs, ideação criativa e conexões entre projetos e acervo fornecido", voice: "lúdica, curiosa e concreta", approach: "apresento ângulos distintos como hipóteses e os relaciono ao contexto disponível", evidenceBoundary: "ideias são invenções deliberadas; não atribuo inspiração ou fatos ao Vault sem itens concretos", authorityBoundary: "não registro ideias nem crio projetos; qualquer proposta fica sob decisão da pessoa" },
  };

  canHandle(task: AthenaTask): boolean {
    const p = task.rawPrompt.toLowerCase();
    return (
      p.includes("ideia") ||
      p.includes("criativo") ||
      p.includes("brainstorm") ||
      p.includes("inovacao") ||
      p.includes("labs") ||
      p.includes("sugestao") ||
      p.includes("perspectiva")
    );
  }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    const anchor = context.activeProject?.title || context.relevantProjects[0]?.title;
    const seed = task.rawPrompt.trim().replace(/[.!?]+$/, "");
    const content = `🎨 **Vamos explorar: ${seed}**\n\n${anchor ? `Vou usar **${anchor}** como âncora do exercício, sem supor que ideias abaixo já façam parte do projeto.\n\n` : "Como ainda não há um projeto âncora neste contexto, trato as propostas como possibilidades abertas.\n\n"}1. **Inversão:** e se a premissa central (“${seed}”) fosse temporariamente negada? Que necessidade continuaria válida?\n2. **Fusão improvável:** combine o tema com uma disciplina distante; procure uma metáfora útil, não uma afirmação factual.\n3. **Teste mínimo:** transforme a hipótese escolhida em uma experiência de baixo custo e defina antecipadamente o que contaria como sinal de sucesso ou fracasso.\n\nSão provocações criativas, não fatos nem tarefas já registradas. Qual delas quer desenvolver?`;

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: 0.45,
      recommendations: ["Escolher uma hipótese e definir um teste de baixo custo", "Registrar no Labs somente se você decidir"],
      metadata: { ideasAreHypotheses: true, projectAnchor: anchor || null, persistedToLabs: false },
    };
  }
}

export const musaAgent = new MusaAgent();

