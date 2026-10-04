import { AthenaAgent, AgentManifest, resolveAgentFollowUp } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { renderAgentPersona, converseAsSpecialist } from "../base-agent";
import { agentGuidanceInstruction, confirmedAgentGuidance, formatExperienceMethodHints, relevantExperienceGuidance } from "../experience-guidance";

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

  async converseWithFeedback(task: AthenaTask, context: AthenaContext): Promise<AgentResult> { return converseAsSpecialist(this, task, context); }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    const resolved = resolveAgentFollowUp(task.rawPrompt.trim(), context);
    const anchor = context.activeProject?.title || context.relevantProjects[0]?.title;
    const seed = resolved.prompt.trim().replace(/[.!?]+$/, "");
    const mode = confirmedAgentGuidance(context, this.manifest.id, "ideationMode", resolved.prompt);
    const style = confirmedAgentGuidance(context, this.manifest.id, "creativeStyle", resolved.prompt);
    const framing = mode === "practical" ? "Vamos começar por uma possibilidade que possa ser testada." : mode === "narrative" ? "Vamos tratar a ideia como uma pequena história possível, não como previsão." : "Vou abrir ângulos diferentes sem escolher por você.";
    const priorOutcomes = relevantExperienceGuidance(context, this.manifest.id);
    const content = `🎨 **Vamos explorar: ${seed}**\n\n${framing} ${anchor ? `Usarei **${anchor}** como âncora, sem supor que as ideias abaixo já façam parte do projeto.` : "Como não há projeto âncora neste contexto, trato as propostas como possibilidades abertas."}\n\n1. **Inversão:** e se a premissa “${seed}” fosse temporariamente negada? Que necessidade continuaria válida?\n2. **Fusão improvável:** aproxime o tema de uma disciplina distante${style === "sensory" ? "; procure uma imagem sensorial que ajude a percebê-lo" : style === "playful" ? "; brinque com a combinação sem confundi-la com evidência" : style === "minimal" ? "; reduza a combinação à menor ideia útil" : style === "experimental" ? "; trate a combinação como hipótese experimental" : "; procure uma metáfora útil, não uma afirmação factual"}.\n3. **Teste mínimo:** transforme a hipótese escolhida em uma experiência de baixo custo e defina antecipadamente o que contaria como sinal de sucesso ou fracasso.${formatExperienceMethodHints(priorOutcomes)}\n\nSão provocações criativas, não fatos nem tarefas já registradas. Qual delas quer desenvolver?`;

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: 0.45,
      recommendations: ["Escolher uma hipótese e definir um teste de baixo custo", "Registrar no Labs somente se você decidir"],
      metadata: { ideasAreHypotheses: true, projectAnchor: anchor || null, persistedToLabs: false, conversationReferenceResolved: resolved.usedHistory, appliedExperienceGuidance: { confirmedPreferences: agentGuidanceInstruction(context, this.manifest.id, resolved.prompt), priorOutcomes }, ideationMode: mode, creativeStyle: style },
    };
  }
}

export const musaAgent = new MusaAgent();

