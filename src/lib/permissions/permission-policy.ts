import {
  VarynthAction,
  ActorType,
  ActorIdentity,
  SecurityTargetDomain,
  SecurityPolicy,
  RiskLevel,
  PermissionRequest,
  PermissionDecision,
  ActionConfirmation,
  AgentSpecialistId,
  AgentPermissionProfile,
} from "./types";
import { athenaEventBus } from "../athena/events/event-bus";

export class PermissionPolicyEngine {
  private activeConfirmations: Map<string, ActionConfirmation> = new Map();

  private agentProfiles: Map<AgentSpecialistId, AgentPermissionProfile> = new Map([
    [
      "justitia",
      {
        agentId: "justitia",
        name: "Justitia",
        allowedDomains: ["CODEX_THESES", "VAULT", "RESEARCH_EVIDENCES", "ARTIFACT_DRAFT"],
        readOnlyDomains: ["WORKSPACE_PROJECT", "TECHNICAL_DOCS"],
        prohibitedActions: ["DELETE_HARD", "EXECUTE"],
        requiresConfirmationActions: ["PUBLISH", "MODIFY", "DELETE_SOFT"],
        rationale: "Especialista jurídica: pode estruturar teses em draft, mas não publica nem altera teses oficiais sem confirmação.",
      },
    ],
    [
      "logos",
      {
        agentId: "logos",
        name: "Logos",
        allowedDomains: ["RESEARCH_EVIDENCES", "VAULT", "ARTIFACT_DRAFT", "SANDBOX_LABS"],
        readOnlyDomains: ["WORKSPACE_PROJECT", "CODEX_THESES"],
        prohibitedActions: ["DELETE_HARD"],
        requiresConfirmationActions: ["PUBLISH", "MODIFY"],
        rationale: "Cientista epistemológico: analisa evidências e cria drafts, requer validação para publicar.",
      },
    ],
    [
      "strategos",
      {
        agentId: "strategos",
        name: "Strategos",
        allowedDomains: ["WORKSPACE_PROJECT", "WORKSPACE_TASK", "CHRONOS", "ARTIFACT_DRAFT"],
        readOnlyDomains: ["VAULT", "CODEX_THESES"],
        prohibitedActions: ["DELETE_HARD"],
        requiresConfirmationActions: ["ARCHIVE", "DELETE_SOFT", "PUBLISH"],
        rationale: "Estrategista de portfólio: propõe planejamentos em draft, exige confirmação para arquivar projetos.",
      },
    ],
    [
      "mnemosyne",
      {
        agentId: "mnemosyne",
        name: "Mnemosyne",
        allowedDomains: ["PERMANENT_MEMORY", "VAULT", "TECHNICAL_DOCS"],
        readOnlyDomains: ["WORKSPACE_PROJECT", "CODEX_THESES"],
        prohibitedActions: ["DELETE_HARD"],
        requiresConfirmationActions: ["MODIFY", "PUBLISH"],
        rationale: "Guardiã da memória: organiza contexto e sugere atualizações passando pelo MemoryGate.",
      },
    ],
    [
      "critias",
      {
        agentId: "critias",
        name: "Critias",
        allowedDomains: ["ARTIFACT_DRAFT", "TECHNICAL_DOCS"],
        readOnlyDomains: ["WORKSPACE_PROJECT", "CODEX_THESES", "RESEARCH_EVIDENCES", "VAULT"],
        prohibitedActions: ["DELETE_HARD", "MODIFY"],
        requiresConfirmationActions: ["PUBLISH"],
        rationale: "Auditor e crítico: audita e aponta falhas em modo somente leitura sem mutação silenciosa.",
      },
    ],
  ]);

  /**
   * Universal evaluation method.
   * Supports both simple (actor, action, domain) and rich PermissionRequest.
   */
  public evaluate(
    requestOrActor: PermissionRequest | ActorType,
    legacyAction?: VarynthAction,
    legacyDomain?: SecurityTargetDomain
  ): PermissionDecision {
    let req: PermissionRequest;
    if (typeof requestOrActor === "string") {
      req = {
        actor: { type: requestOrActor },
        action: legacyAction || "READ",
        targetDomain: legacyDomain || "WORKSPACE_PROJECT",
      };
    } else {
      req = requestOrActor;
    }

    const actorIdentity: ActorIdentity =
      typeof req.actor === "string" ? { type: req.actor } : req.actor;
    const actorType = actorIdentity.type;
    const action = req.action;
    const domain = req.targetDomain;
    const status = req.resourceStatus;

    // 1. RISK ASSESSMENT
    const riskLevel = this.calculateRiskLevel(action, domain, req.isBatch, req.batchCount);

    // 2. USER ACTOR: Full Sovereign Authority (with soft delete confirmation)
    if (actorType === "USER") {
      if (action === "DELETE_HARD") {
        return this.createDecision("CONFIRM", riskLevel, "Destruição permanente exige confirmação explícita do usuário.");
      }
      return this.createDecision("ALLOW", riskLevel, "Usuário possui autoridade soberana irrestrita.");
    }

    // 3. CORE SOVEREIGN RULE: Athena cannot mutate or execute against Core
    if (domain === "CORE_SYSTEM") {
      if (action === "READ") {
        return this.createDecision("ALLOW", "LOW", "Athena pode analisar e compreender a arquitetura do Core.");
      }
      return this.createDecision(
        "DENY",
        "CRITICAL",
        "Athena não possui autorização para alterar ou executar diretamente no Core do VARYNTH (Core Sovereign Rule).",
        "Crie uma proposta de melhoria ou protótipo isolado na Sandbox."
      );
    }

    // 4. HARD DELETE RULE: Athena is strictly DENIED permanent deletion
    if (action === "DELETE_HARD" || (domain === "TRASH_BIN" && action === "DELETE_SOFT")) {
      return this.createDecision(
        "DENY",
        "CRITICAL",
        "Athena não tem permissão para realizar destruição permanente de dados (Alex Principle).",
        "Mova o item para a Lixeira com quarentena de 10 dias."
      );
    }

    // 5. SANDBOX BOUNDARY
    if (domain === "SANDBOX_LABS") {
      if (action === "EXECUTE") {
        return this.createDecision("SANDBOX", "MEDIUM", "Execução permitida exclusivamente no ambiente isolado da Sandbox.");
      }
      if (action === "CREATE" || action === "READ" || action === "MODIFY") {
        return this.createDecision("ALLOW", "LOW", "Prototipagem no Labs permitida de forma autônoma.");
      }
    }

    // 6. AGENT PROFILE CONSTRAINTS
    if (actorIdentity.agentId && this.agentProfiles.has(actorIdentity.agentId as AgentSpecialistId)) {
      const profile = this.agentProfiles.get(actorIdentity.agentId as AgentSpecialistId)!;

      if (profile.prohibitedActions.includes(action)) {
        return this.createDecision(
          "DENY",
          riskLevel,
          `O agente especialista ${profile.name} não tem autoridade para '${action}' (${profile.rationale})`
        );
      }

      if (profile.readOnlyDomains.includes(domain) && action !== "READ") {
        return this.createDecision(
          "CONFIRM",
          "HIGH",
          `O domínio '${domain}' é somente-leitura para o especialista ${profile.name}. Alterações requerem confirmação humana.`
        );
      }

      if (profile.requiresConfirmationActions.includes(action)) {
        return this.createDecision(
          "CONFIRM",
          riskLevel,
          `A ação '${action}' pelo especialista ${profile.name} exige confirmação humana (${profile.rationale})`
        );
      }
    }

    // 7. BATCH OPERATIONS SAFETY
    if (req.isBatch && (req.batchCount || 0) > 1 && ["DELETE_SOFT", "MODIFY", "ARCHIVE"].includes(action)) {
      return this.createDecision(
        "CONFIRM",
        riskLevel,
        `Operação em lote afetando ${req.batchCount} itens requer confirmação explícita para evitar mutação acidental.`
      );
    }

    // 8. ARTIFACT LIFECYCLE RULES
    if (domain.startsWith("ARTIFACT")) {
      if (action === "CREATE") {
        return this.createDecision("ALLOW", "LOW", "Criação de novos artefatos em status DRAFT é permitida com snapshot v1.0.");
      }

      if (status === "ACTIVE" || status === "PUBLISHED" || domain === "ARTIFACT_ACTIVE" || domain === "ARTIFACT_PUBLISHED") {
        if (action === "MODIFY") {
          return this.createDecision(
            "CONFIRM",
            "HIGH",
            "Modificar artefato ativo/publicado requer confirmação humana e snapshot histórico de segurança."
          );
        }
        if (action === "PUBLISH" || action === "PROMOTE") {
          return this.createDecision("CONFIRM", "HIGH", "Publicação e promoção oficial de artefatos exigem aprovação humana.");
        }
      }

      if (status === "DRAFT" || domain === "ARTIFACT_DRAFT") {
        if (action === "MODIFY" || action === "READ") {
          return this.createDecision("ALLOW", "LOW", "Modificação de rascunhos de artefatos permitida de forma autônoma.");
        }
      }
    }

    // 9. TECHNICAL DOCUMENTATION & REVIEWS
    if (domain === "TECHNICAL_DOCS") {
      if (action === "READ") {
        return this.createDecision("ALLOW", "LOW", "Consulta à documentação técnica oficial é permitida.");
      }
      if (action === "PUBLISH" || action === "MODIFY") {
        return this.createDecision(
          "CONFIRM",
          "HIGH",
          "Publicações e alterações em /docs exigem aprovação humana na Documentation Review Queue."
        );
      }
    }

    // 10. SOFT DELETIONS (Alex Principle)
    if (action === "DELETE_SOFT") {
      return this.createDecision(
        "CONFIRM",
        "HIGH",
        "Mover item para a Lixeira requer confirmação e suporte a Desfazer (Undo)."
      );
    }

    // 11. IMPORT & EXPORT
    if (action === "EXPORT") {
      return this.createDecision("ALLOW", "LOW", "Exportação sanitizada de dados permitida (zero segredos incluídos).");
    }
    if (action === "IMPORT") {
      return this.createDecision("CONFIRM", "HIGH", "Importação de dados pode alterar registros existentes e exige confirmação humana.");
    }

    // 12. GENERAL WORKSPACE READ & LIGHTWEIGHT CREATION
    if (action === "READ") {
      return this.createDecision("ALLOW", "LOW", "Leitura e análise contextual permitida.");
    }

    if (action === "CREATE" && ["WORKSPACE_TASK", "WORKSPACE_NOTE", "WORKSPACE_PROJECT"].includes(domain)) {
      return this.createDecision("ALLOW", "LOW", "Criação de tarefas e notas operacionais permitida.");
    }

    // 13. SAFE DEFAULT: Unknown combinations FAIL CLOSED (CONFIRM or DENY)
    return this.createDecision(
      "CONFIRM",
      riskLevel,
      `Combinação não mapeada (${actorType} -> ${action} em ${domain}) tratada com política de segurança Fail-Closed.`
    );
  }

  private calculateRiskLevel(
    action: VarynthAction,
    domain: SecurityTargetDomain,
    isBatch?: boolean,
    batchCount?: number
  ): RiskLevel {
    if (action === "DELETE_HARD" || domain === "CORE_SYSTEM") return "CRITICAL";
    if (isBatch && (batchCount || 0) > 3) return "CRITICAL";
    if (action === "DELETE_SOFT" || action === "PUBLISH" || action === "IMPORT" || domain === "ARTIFACT_PUBLISHED") return "HIGH";
    if (action === "MODIFY" || action === "PROMOTE" || action === "ARCHIVE") return "MEDIUM";
    return "LOW";
  }

  private createDecision(
    policy: SecurityPolicy,
    riskLevel: RiskLevel,
    reason: string,
    suggestedAlternative?: string
  ): PermissionDecision {
    const decision: PermissionDecision = {
      allowed: policy === "ALLOW" || policy === "SANDBOX",
      policy,
      riskLevel,
      requiresConfirmation: policy === "CONFIRM",
      reason,
      suggestedAlternative,
      auditRequired: riskLevel === "HIGH" || riskLevel === "CRITICAL" || policy === "CONFIRM" || policy === "DENY",
    };

    if (decision.auditRequired) {
      athenaEventBus.emit("PERMISSION_EVALUATED", {
        policy: decision.policy,
        riskLevel: decision.riskLevel,
        reason: decision.reason,
        timestamp: new Date().toISOString(),
      });
    }

    return decision;
  }

  /**
   * Generates a single-use ActionConfirmation token for high-risk operations.
   */
  public generateConfirmation(
    action: VarynthAction,
    targetDomain: SecurityTargetDomain,
    summary: string,
    consequences: string[] = [],
    resourceId?: string
  ): ActionConfirmation {
    const actionId = `conf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const token = `token-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min expiry

    const confirmation: ActionConfirmation = {
      actionId,
      token,
      action,
      targetDomain,
      resourceId,
      summary,
      consequences,
      expiresAt,
      used: false,
    };

    this.activeConfirmations.set(token, confirmation);

    athenaEventBus.emit("ACTION_CONFIRMATION_REQUIRED", {
      actionId,
      action,
      targetDomain,
      summary,
      expiresAt,
    });

    return confirmation;
  }

  /**
   * Verifies and safely consumes a confirmation token (One-Time Token, prevents reuse).
   */
  public verifyAndConsumeToken(token: string): { valid: boolean; confirmation?: ActionConfirmation; error?: string } {
    const confirmation = this.activeConfirmations.get(token);
    if (!confirmation) {
      return { valid: false, error: "Token de confirmação inexistente ou expirado." };
    }

    if (confirmation.used) {
      return { valid: false, error: "Token de confirmação já utilizado anteriormente (replay attack prevenido)." };
    }

    if (new Date(confirmation.expiresAt).getTime() < Date.now()) {
      this.activeConfirmations.delete(token);
      return { valid: false, error: "Token de confirmação expirado (tempo limite de 15 minutos excedido)." };
    }

    // Mark as used
    confirmation.used = true;
    this.activeConfirmations.set(token, confirmation);

    athenaEventBus.emit("ACTION_CONFIRMATION_CONSUMED", {
      actionId: confirmation.actionId,
      token,
      timestamp: new Date().toISOString(),
    });

    return { valid: true, confirmation };
  }

  /**
   * Capability discovery for Athena planner.
   */
  public discoverCapabilities(actorType: ActorType = "ATHENA", domain: SecurityTargetDomain = "WORKSPACE_PROJECT"): {
    allowedActions: VarynthAction[];
    confirmRequiredActions: VarynthAction[];
    prohibitedActions: VarynthAction[];
  } {
    const allActions: VarynthAction[] = [
      "READ",
      "CREATE",
      "MODIFY",
      "DELETE_SOFT",
      "DELETE_HARD",
      "RESTORE",
      "EXECUTE",
      "PUBLISH",
      "EXPORT",
      "IMPORT",
      "MOVE",
      "SHARE",
      "LINK",
      "UNLINK",
      "ARCHIVE",
      "PROMOTE",
      "ROLLBACK",
    ];

    const allowedActions: VarynthAction[] = [];
    const confirmRequiredActions: VarynthAction[] = [];
    const prohibitedActions: VarynthAction[] = [];

    allActions.forEach((act) => {
      const dec = this.evaluate({ actor: { type: actorType }, action: act, targetDomain: domain });
      if (dec.policy === "ALLOW" || dec.policy === "SANDBOX") {
        allowedActions.push(act);
      } else if (dec.policy === "CONFIRM") {
        confirmRequiredActions.push(act);
      } else {
        prohibitedActions.push(act);
      }
    });

    return { allowedActions, confirmRequiredActions, prohibitedActions };
  }

  /**
   * Provides explainability for decisions ("WHY?").
   */
  public explainDecision(req: PermissionRequest): string {
    const dec = this.evaluate(req);
    const actorStr = typeof req.actor === "string" ? req.actor : `${req.actor.type}${req.actor.agentId ? ` (${req.actor.agentId})` : ""}`;
    return `[Decisão: ${dec.policy} | Risco: ${dec.riskLevel}] Ator: ${actorStr} -> Ação: ${req.action} no domínio '${req.targetDomain}'. Justificativa: ${dec.reason}${dec.suggestedAlternative ? ` Alternativa sugerida: ${dec.suggestedAlternative}` : ""}`;
  }
}

export const permissionPolicyEngine = new PermissionPolicyEngine();
