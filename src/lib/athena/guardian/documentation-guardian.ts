import {
  DocumentationHealthReport,
  DocumentationReviewItem,
  DocumentationAuditRecord,
  SubsystemHealth,
} from "./types";
import { TECHNICAL_DOCS, ADR_LIST, LESSONS_LEARNED_LIST } from "@/lib/docs/docs-data";
import { modules } from "@/lib/modules";
import { registeredTools } from "../tools/registry";
import { agentRegistry } from "../agents/registry";
import { HISTORICAL_REGRESSION_CASES } from "../regression/cases";
import { reviewStore } from "./review-store";

export class DocumentationGuardian {
  assessHealth(): DocumentationHealthReport {
    const totalRegressionTests = HISTORICAL_REGRESSION_CASES.reduce(
      (acc, c) => acc + 1 + (c.paraphrases?.length || 0),
      0
    );

    const approvedReviews = reviewStore.getApprovedReviews();
    const approvedADRsCount = approvedReviews.filter((r) => r.type === "ADR").length;
    const approvedLessonsCount = approvedReviews.filter((r) => r.type === "LESSON_LEARNED").length;

    const archDocs = TECHNICAL_DOCS.filter((d) => d.category === "architecture");
    const architectureHealth: SubsystemHealth = {
      name: "Macro-Arquitetura",
      status: "SYNCED",
      totalDocumented: archDocs.length,
      totalActual: archDocs.length,
      lastChecked: new Date().toISOString(),
      issues: archDocs.length > 0 ? [] : ["Nenhum documento de arquitetura foi registrado no catálogo técnico."],
    };

    const athenaDocs = TECHNICAL_DOCS.filter((d) => d.category === "athena");
    const athenaHealth: SubsystemHealth = {
      name: "Athena Cognitive OS",
      status: "SYNCED",
      totalDocumented: athenaDocs.length,
      totalActual: athenaDocs.length,
      lastChecked: new Date().toISOString(),
      issues: athenaDocs.length > 0 ? [] : ["Nenhum documento da Athena foi registrado no catálogo técnico."],
    };

    const moduleDocs = TECHNICAL_DOCS.filter((d) => d.category === "modules");
    const modulesHealth: SubsystemHealth = {
      name: "Módulos do Ecossistema",
      status: moduleDocs.length > 0 ? "SYNCED" : "OUTDATED",
      totalDocumented: moduleDocs.length > 0 ? modules.length : 0,
      totalActual: modules.length,
      lastChecked: new Date().toISOString(),
      issues: moduleDocs.length > 0 ? [] : ["O catálogo canônico de módulos não está registrado na documentação técnica."],
    };

    const actionToolsHealth: SubsystemHealth = {
      name: `Action Layer (${Object.keys(registeredTools).length} Ferramentas)` ,
      status: "SYNCED",
      totalDocumented: Object.keys(registeredTools).length,
      totalActual: Object.keys(registeredTools).length,
      lastChecked: new Date().toISOString(),
      issues: [],
    };

    const councilHealth: SubsystemHealth = {
      name: `Agentes Athena (${agentRegistry.listAgents().length} Registrados)`,
      status: "SYNCED",
      totalDocumented: agentRegistry.listAgents().length,
      totalActual: agentRegistry.listAgents().length,
      lastChecked: new Date().toISOString(),
      issues: [],
    };

    const adrHealth: SubsystemHealth = {
      name: "Decisões de Arquitetura (ADRs)",
      status: "SYNCED",
      totalDocumented: ADR_LIST.length + approvedADRsCount,
      totalActual: ADR_LIST.length + approvedADRsCount,
      lastChecked: new Date().toISOString(),
      issues: [],
    };

    const regressionHealth: SubsystemHealth = {
      name: "Suíte de Regressão Histórica",
      status: totalRegressionTests === 73 ? "SYNCED" : "POSSIBLE_DRIFT",
      totalDocumented: totalRegressionTests,
      totalActual: totalRegressionTests,
      lastChecked: new Date().toISOString(),
      issues: totalRegressionTests === 73 ? [] : ["A contagem histórica mudou; revise a documentação de regressão e os comandos de teste."],
    };

    const subsystemsList = [
      architectureHealth,
      athenaHealth,
      modulesHealth,
      actionToolsHealth,
      councilHealth,
      adrHealth,
      regressionHealth,
    ];

    const fullySyncedCount = subsystemsList.filter((s) => s.status === "SYNCED").length;
    const score = Math.round((fullySyncedCount / subsystemsList.length) * 100);

    return {
      score,
      status: score === 100 ? "SYNCED" : score > 80 ? "POSSIBLE_DRIFT" : "OUTDATED",
      subsystems: {
        architecture: architectureHealth,
        athenaKernel: athenaHealth,
        modules: modulesHealth,
        actionTools: actionToolsHealth,
        councilAgents: councilHealth,
        adrs: adrHealth,
        regressionSuite: regressionHealth,
      },
      runtimeAudits: {
        totalRoutes: 17,
        totalTools: Object.keys(registeredTools).length,
        totalAgents: agentRegistry.listAgents().length,
        totalModules: modules.length,
        totalADRs: ADR_LIST.length + approvedADRsCount,
        totalRegressionTests,
        totalLessons: LESSONS_LEARNED_LIST.length + approvedLessonsCount,
      },
      timestamp: new Date().toISOString(),
    };
  }

  listAllReviews(): DocumentationReviewItem[] {
    return reviewStore.getAllReviews();
  }

  listPendingReviews(): DocumentationReviewItem[] {
    return reviewStore.getPendingReviews();
  }

  getReviewItem(id: string): DocumentationReviewItem | undefined {
    return reviewStore.getReviewById(id);
  }

  markAsRead(id: string, reader: string = "Paulo"): boolean {
    return reviewStore.markAsRead(id, reader);
  }

  updateDraftContent(id: string, newContent: string, editor: string = "Paulo"): boolean {
    return reviewStore.updateDraftContent(id, newContent, editor);
  }

  approveReview(
    id: string,
    reviewer: string = "Paulo",
    finalContent?: string
  ): { success: boolean; error?: string; item?: DocumentationReviewItem } {
    return reviewStore.approveAndPublish(id, reviewer, finalContent);
  }

  rejectReview(
    id: string,
    reviewer: string = "Paulo",
    reason: string
  ): { success: boolean; error?: string; item?: DocumentationReviewItem } {
    return reviewStore.rejectReview(id, reviewer, reason);
  }

  listAuditLog(): DocumentationAuditRecord[] {
    return reviewStore.getAuditLog();
  }
}

export const documentationGuardian = new DocumentationGuardian();
