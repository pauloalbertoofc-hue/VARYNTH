import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";

export class MusaAgent implements AthenaAgent {
  manifest: AgentManifest = {
    id: "musa",
    name: "Musa",
    role: "Especialista em Criatividade, Ideação & Brainstorming",
    version: "2.0.0",
    description: "Geração de novas perspectivas, conexões inusitadas, hipóteses criativas e incubação de ideias no Labs.",
    skills: ["criatividade", "ideacao", "brainstorming", "inovacao", "labs", "hipoteses_criativas"],
    priority: 75,
    enabled: true,
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
    const content = `🎨 **Brainstorming & Novas Perspectivas (Musa):**\n\n1. **Ângulo Inovador:** Como podemos recombinar os dados existentes no Vault sob uma abordagem interdisciplinar?\n2. **Hipótese Disruptiva:** Se invertêssemos a premissa padrão, qual seria a consequência prática para este projeto?\n3. **Incubação no Labs:** Recomendo registrar esta ideia preliminar no Labs para testar a viabilidade antes de promover a um projeto completo.`;

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: 0.88,
      recommendations: ["Incubar no Labs antes de oficializar", "Explorar conexões cruzadas com outras áreas"],
    };
  }
}

export const musaAgent = new MusaAgent();

