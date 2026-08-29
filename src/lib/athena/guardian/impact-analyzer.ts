import { DocumentationImpact, ImpactType, UpdateLevel } from "./types";

export interface CodeChangeEvent {
  filePath: string;
  changeType: "CREATE" | "MODIFY" | "DELETE";
  symbolName?: string;
  isContractChange?: boolean;
  isSecurityChange?: boolean;
  isNewRoute?: boolean;
  isNewModule?: boolean;
  isNewTool?: boolean;
  isNewAgent?: boolean;
  description: string;
}

export class DocumentationImpactAnalyzer {
  /**
   * Avalia o impacto documental de uma alteração de código ou runtime.
   */
  analyze(event: CodeChangeEvent): DocumentationImpact {
    // 1. Mudanças irrelevantes / triviais (CSS, formatação, refatoração pura)
    if (
      event.filePath.endsWith(".css") ||
      event.filePath.includes("tailwind") ||
      (!event.isContractChange &&
        !event.isSecurityChange &&
        !event.isNewRoute &&
        !event.isNewModule &&
        !event.isNewTool &&
        !event.isNewAgent &&
        event.changeType === "MODIFY" &&
        !event.description.toLowerCase().includes("adr") &&
        !event.description.toLowerCase().includes("lesson"))
    ) {
      return {
        requiresUpdate: false,
        affectedComponents: [],
        affectedDocuments: [],
        impactType: "BEHAVIOR",
        confidence: "HIGH",
        updateLevel: "SAFE_AUTO_UPDATE",
        reason: "Alteração de implementação interna ou estilo sem impacto em contratos públicos ou arquitetura.",
        sourceEvidence: event.filePath,
      };
    }

    // 2. Novo Módulo do Ecossistema
    if (event.isNewModule || event.filePath.startsWith("src/app/modules/")) {
      return {
        requiresUpdate: true,
        affectedComponents: [event.symbolName || event.filePath],
        affectedDocuments: [
          "docs/architecture/system-map.md",
          "docs/varynth/modules.md",
          "src/lib/docs/docs-data.ts",
        ],
        impactType: "MODULE",
        confidence: "HIGH",
        updateLevel: "SAFE_AUTO_UPDATE",
        reason: "Novo módulo ou rota de subsistema adicionada ao ecossistema VARYNTH.",
        sourceEvidence: `File: ${event.filePath}`,
      };
    }

    // 3. Nova Ferramenta / Ação na Action Layer
    if (event.isNewTool || event.filePath.includes("src/lib/athena/tools/")) {
      return {
        requiresUpdate: true,
        affectedComponents: [event.symbolName || "AthenaActionLayer"],
        affectedDocuments: ["docs/athena/tools.md", "src/lib/docs/docs-data.ts"],
        impactType: "API",
        confidence: "HIGH",
        updateLevel: "SAFE_AUTO_UPDATE",
        reason: "Nova ferramenta determinística ou alteração de contrato na Action Layer da Athena.",
        sourceEvidence: `Tool Definition in ${event.filePath}`,
      };
    }

    // 4. Novo Agente ou Alteração no Conselho
    if (event.isNewAgent || event.filePath.includes("src/lib/athena/agents/")) {
      return {
        requiresUpdate: true,
        affectedComponents: [event.symbolName || "CouncilOfAgents"],
        affectedDocuments: ["docs/athena/agents.md", "src/lib/docs/docs-data.ts"],
        impactType: "ARCHITECTURE",
        confidence: "HIGH",
        updateLevel: "SAFE_AUTO_UPDATE",
        reason: "Especialista do Conselho adicionado ou modificado no AgentRegistry.",
        sourceEvidence: `Agent Registry in ${event.filePath}`,
      };
    }

    // 5. Segurança, Retenção da Lixeira ou Alex Principle
    if (event.isSecurityChange || event.filePath.includes("trash") || event.filePath.includes("safety")) {
      return {
        requiresUpdate: true,
        affectedComponents: ["SecurityModel", "TrashManager", "AlexPrinciple"],
        affectedDocuments: [
          "docs/architecture/security-model.md",
          "docs/varynth/trash.md",
          "docs/adr/ADR-002-ten-day-trash-retention.md",
        ],
        impactType: "SECURITY",
        confidence: "HIGH",
        updateLevel: "REVIEW_REQUIRED",
        reason: "Alteração crítica em modelo de segurança ou retenção temporal.",
        sourceEvidence: `Security commit: ${event.description}`,
      };
    }

    // 6. Decisões Arquiteturais e Lições Aprendidas (Sempre exigem revisão humana)
    if (event.description.toLowerCase().includes("adr") || event.description.toLowerCase().includes("lesson")) {
      return {
        requiresUpdate: true,
        affectedComponents: ["ADRRegistry", "LessonsLearned"],
        affectedDocuments: ["docs/adr/", "docs/history/lessons-learned.md"],
        impactType: "HISTORY",
        confidence: "MEDIUM",
        updateLevel: "REVIEW_REQUIRED",
        reason: "Nova justificativa histórica ou decisão arquitetural proposta.",
        sourceEvidence: event.description,
      };
    }

    // Default: Alteração de contrato
    return {
      requiresUpdate: true,
      affectedComponents: [event.symbolName || event.filePath],
      affectedDocuments: ["docs/architecture/overview.md"],
      impactType: "CONTRACT",
      confidence: "MEDIUM",
      updateLevel: "SAFE_AUTO_UPDATE",
      reason: "Alteração de contrato público ou schema tipado.",
      sourceEvidence: event.filePath,
    };
  }
}

export const documentationImpactAnalyzer = new DocumentationImpactAnalyzer();
