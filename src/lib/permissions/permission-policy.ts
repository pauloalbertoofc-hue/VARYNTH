import {
  SecurityAction,
  SecurityActor,
  SecurityTargetDomain,
  SecurityPolicy,
  PermissionEvaluationResult,
  PermissionRule,
} from "./types";

export class PermissionPolicyEngine {
  private rules: PermissionRule[] = [
    // 1. CORE SYSTEM PROTECTION
    {
      id: "RULE-CORE-001",
      actor: "ATHENA",
      action: "MODIFY",
      targetDomain: "CORE_SYSTEM",
      policy: "DENY",
      reason: "Athena não possui autorização para alterar o código-fonte do Core do VARYNTH.",
    },
    {
      id: "RULE-CORE-002",
      actor: "ATHENA",
      action: "EXECUTE",
      targetDomain: "CORE_SYSTEM",
      policy: "DENY",
      reason: "Execução direta no runtime do host sem isolamento é estritamente proibida.",
    },

    // 2. SANDBOX & LABS
    {
      id: "RULE-SANDBOX-001",
      actor: "ATHENA",
      action: "EXECUTE",
      targetDomain: "SANDBOX_LABS",
      policy: "SANDBOX",
      reason: "Execução permitida sob ambiente isolado de Sandbox sem acesso a rede externa ou IO destrutivo.",
    },
    {
      id: "RULE-SANDBOX-002",
      actor: "ATHENA",
      action: "CREATE",
      targetDomain: "SANDBOX_LABS",
      policy: "ALLOW",
      reason: "Criação de protótipos e experimentos no Labs é permitida de forma autônoma.",
    },

    // 3. ARTIFACTS & WORKSPACES
    {
      id: "RULE-ART-001",
      actor: "ATHENA",
      action: "CREATE",
      targetDomain: "ARTIFACT_DRAFT",
      policy: "ALLOW",
      reason: "Criação de rascunhos de artefatos é permitida com snapshot inicial.",
    },
    {
      id: "RULE-ART-002",
      actor: "ATHENA",
      action: "MODIFY",
      targetDomain: "ARTIFACT_ACTIVE",
      policy: "CONFIRM",
      reason: "Modificar artefato ativo requer confirmação humana ou criação de nova versão.",
    },

    // 4. DELETION & TRASH (Alex Principle)
    {
      id: "RULE-DEL-001",
      actor: "ATHENA",
      action: "DELETE",
      targetDomain: "WORKSPACE_PROJECT",
      policy: "CONFIRM",
      reason: "Exclusão de projetos/itens requer confirmação explícita e envio para Lixeira com 10 dias de retenção.",
    },
    {
      id: "RULE-DEL-002",
      actor: "ATHENA",
      action: "DELETE",
      targetDomain: "TRASH_BIN",
      policy: "DENY",
      reason: "Athena não tem permissão para expurgar ou destruir itens da lixeira permanentemente.",
    },

    // 5. DOCUMENTATION & REVIEWS
    {
      id: "RULE-DOC-001",
      actor: "ATHENA",
      action: "PUBLISH",
      targetDomain: "TECHNICAL_DOCS",
      policy: "CONFIRM",
      reason: "Publicações em /docs exigem revisão humana na Documentation Review Queue.",
    },

    // 6. GENERAL READ & EXPORT
    {
      id: "RULE-GEN-001",
      actor: "ATHENA",
      action: "READ",
      targetDomain: "WORKSPACE_PROJECT",
      policy: "ALLOW",
      reason: "Leitura contextual permitida para raciocínio epistêmico.",
    },
    {
      id: "RULE-GEN-002",
      actor: "ATHENA",
      action: "EXPORT",
      targetDomain: "DATA_EXPORT",
      policy: "ALLOW",
      reason: "Geração de backups e exportações sanitizadas é permitida.",
    },
  ];

  public evaluate(
    actor: SecurityActor,
    action: SecurityAction,
    targetDomain: SecurityTargetDomain
  ): PermissionEvaluationResult {
    // 1. User has Sovereign Access (always ALLOW except direct hard delete without confirmation)
    if (actor === "USER") {
      return {
        allowed: true,
        policy: "ALLOW",
        requiresConfirmation: action === "DELETE" && targetDomain === "CORE_SYSTEM",
        reason: "Usuário soberano possui acesso irrestrito ao sistema.",
        auditRequired: action !== "READ",
      };
    }

    // 2. Find explicit rule
    const rule = this.rules.find(
      (r) => r.actor === actor && r.action === action && r.targetDomain === targetDomain
    );

    if (rule) {
      return {
        allowed: rule.policy !== "DENY",
        policy: rule.policy,
        requiresConfirmation: rule.policy === "CONFIRM",
        reason: rule.reason,
        auditRequired: true,
      };
    }

    // 3. Fallback defaults for safety
    if (action === "READ") {
      return {
        allowed: true,
        policy: "ALLOW",
        requiresConfirmation: false,
        reason: "Leitura padrão concedida.",
        auditRequired: false,
      };
    }

    if (action === "DELETE" || action === "PUBLISH") {
      return {
        allowed: true,
        policy: "CONFIRM",
        requiresConfirmation: true,
        reason: `Ação sensível ${action} requer validação de segurança.`,
        auditRequired: true,
      };
    }

    return {
      allowed: true,
      policy: "ALLOW",
      requiresConfirmation: false,
      reason: "Ação autorizada pelas políticas operacionais padrão.",
      auditRequired: true,
    };
  }

  public getRules(): PermissionRule[] {
    return JSON.parse(JSON.stringify(this.rules));
  }
}

export const permissionPolicyEngine = new PermissionPolicyEngine();

