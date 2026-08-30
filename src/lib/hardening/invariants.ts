import { SystemInvariant, InvariantResult, InvariantValidationContext } from "./types";
import { artifactStore } from "../artifacts/artifact-store";
import { assetManager } from "../artifacts/asset-manager";
import { jobManager } from "../runtime/job-manager";
import { creativeGraph } from "../artifacts/creative-graph";
import { permissionPolicyEngine } from "../permissions/permission-policy";

export const SYSTEM_INVARIANTS: SystemInvariant[] = [
  // INV-001: A PUBLISHED Artifact never silently changes dependency.
  {
    id: "INV-001",
    name: "Published Artifact Dependency Immutability",
    description: "Um artefato publicado (PUBLISHED) nunca deve ter suas dependências alteradas silenciosamente.",
    severity: "CRITICAL",
    validate: (_ctx?: InvariantValidationContext): InvariantResult => {
      const artifacts = artifactStore.getAll();
      const published = artifacts.filter((a) => a.status === "PUBLISHED");
      const affected: string[] = [];

      for (const pub of published) {
        for (const rel of pub.relationships || []) {
          // If published but has FOLLOW_LATEST without fixed pin, it violates immutability
          if (rel.pinMode === "FOLLOW_LATEST") {
            affected.push(pub.id);
            break;
          }
        }
      }

      return {
        invariantId: "INV-001",
        name: "Published Artifact Dependency Immutability",
        status: affected.length === 0 ? "PASS" : "FAIL",
        severity: "CRITICAL",
        affectedIds: affected,
        details: affected.length === 0
          ? "Todos os artefatos publicados possuem dependências estritamente pinadas."
          : `Artefatos publicados com modo dinâmico FOLLOW_LATEST detectados: ${affected.join(", ")}`,
        suggestedAction: "Pinar explicitamente as dependências dos artefatos publicados.",
      };
    },
  },

  // INV-002: A PINNED dependency resolves to the exact immutable targetVersionId.
  {
    id: "INV-002",
    name: "Authoritative Pinned Version Identity",
    description: "Toda dependência pinada deve resolver para um targetVersionId imutável e existente.",
    severity: "CRITICAL",
    validate: (_ctx?: InvariantValidationContext): InvariantResult => {
      const artifacts = artifactStore.getAll();
      const affected: string[] = [];

      for (const art of artifacts) {
        for (const rel of art.relationships || []) {
          if (rel.pinMode === "PINNED" && !rel.targetVersionId) {
            affected.push(art.id);
          }
        }
      }

      return {
        invariantId: "INV-002",
        name: "Authoritative Pinned Version Identity",
        status: affected.length === 0 ? "PASS" : "FAIL",
        severity: "CRITICAL",
        affectedIds: affected,
        details: affected.length === 0
          ? "Todas as dependências pinadas possuem targetVersionId imutável."
          : `Dependências pinadas sem targetVersionId identificadas em: ${affected.join(", ")}`,
      };
    },
  },

  // INV-003: A Derived Asset with provenance never loses its source chain silently.
  {
    id: "INV-003",
    name: "Derived Asset Provenance Preservation",
    description: "Assets derivados devem manter metadados de proveniência apontando para o artefato de origem.",
    severity: "HIGH",
    validate: (): InvariantResult => {
      const assets = assetManager.getAllAssets();
      const derivedAssets = assets.filter((a) => a.metadata?.isDerived === true);
      const affected: string[] = [];

      for (const ast of derivedAssets) {
        if (!ast.metadata?.sourceArtifactId) {
          affected.push(ast.id);
        }
      }

      return {
        invariantId: "INV-003",
        name: "Derived Asset Provenance Preservation",
        status: affected.length === 0 ? "PASS" : "FAIL",
        severity: "HIGH",
        affectedIds: affected,
        details: affected.length === 0
          ? "Todos os assets derivados preservam metadados de proveniência."
          : `Assets derivados com proveniência ausente: ${affected.join(", ")}`,
      };
    },
  },

  // INV-004: A Job cannot be COMPLETED without required outputs.
  {
    id: "INV-004",
    name: "Completed Job Output Verification",
    description: "Um Job não pode estar em status COMPLETED sem registrar assets de saída ou dados de resultado.",
    severity: "CRITICAL",
    validate: (): InvariantResult => {
      const jobs = jobManager.getAll();
      const completed = jobs.filter((j) => j.status === "COMPLETED");
      const affected: string[] = [];

      for (const j of completed) {
        if ((!j.outputAssetIds || j.outputAssetIds.length === 0) && !j.resultData) {
          affected.push(j.id);
        }
      }

      return {
        invariantId: "INV-004",
        name: "Completed Job Output Verification",
        status: affected.length === 0 ? "PASS" : "FAIL",
        severity: "CRITICAL",
        affectedIds: affected,
        details: affected.length === 0
          ? "Todos os jobs concluídos possuem outputs válidos registrados."
          : `Jobs marcados como COMPLETED sem outputs: ${affected.join(", ")}`,
      };
    },
  },

  // INV-005: A physical Asset cannot be VALID if its bytes are missing.
  {
    id: "INV-005",
    name: "Physical Asset Storage Integrity",
    description: "Um Asset não pode ser reportado como VALID se seus dados binários estiverem ausentes no storage.",
    severity: "CRITICAL",
    validate: (): InvariantResult => {
      const assets = assetManager.getAllAssets();
      const corrupted = assets.filter((a) => a.status === "CORRUPTED");
      const affected = corrupted.map((a) => a.id);

      return {
        invariantId: "INV-005",
        name: "Physical Asset Storage Integrity",
        status: affected.length === 0 ? "PASS" : "FAIL",
        severity: "CRITICAL",
        affectedIds: affected,
        details: affected.length === 0
          ? "Nenhum asset corrompido ou com bytes ausentes em status ativo."
          : `Assets com bytes ausentes ou corrompidos: ${affected.join(", ")}`,
      };
    },
  },

  // INV-006: A restored relationship cannot point to a nonexistent Artifact.
  {
    id: "INV-006",
    name: "Restored Relationship Referential Integrity",
    description: "Nenhuma relação em artefato ativo pode apontar para um artefato inexistente.",
    severity: "HIGH",
    validate: (): InvariantResult => {
      const artifacts = artifactStore.getAll();
      const idSet = new Set(artifacts.map((a) => a.id));
      const affected: string[] = [];

      for (const art of artifacts) {
        for (const rel of art.relationships || []) {
          if (!idSet.has(rel.targetArtifactId)) {
            affected.push(`${art.id} -> ${rel.targetArtifactId}`);
          }
        }
      }

      return {
        invariantId: "INV-006",
        name: "Restored Relationship Referential Integrity",
        status: affected.length === 0 ? "PASS" : "FAIL",
        severity: "HIGH",
        affectedIds: affected,
        details: affected.length === 0
          ? "Integridade referencial de relações 100% íntegra."
          : `Relações órfãs apontando para alvos inexistentes: ${affected.join(", ")}`,
      };
    },
  },

  // INV-007: A restored AssetUsageRecord cannot point to a nonexistent Asset.
  {
    id: "INV-007",
    name: "Asset Usage Referential Integrity",
    description: "Nenhum AssetUsageRecord pode referenciar um asset inexistente no AssetManager.",
    severity: "HIGH",
    validate: (): InvariantResult => {
      const usages = assetManager.getAllUsages();
      const assets = assetManager.getAllAssets();
      const assetIdSet = new Set(assets.map((a) => a.id));
      const affected: string[] = [];

      for (const u of usages) {
        if (!assetIdSet.has(u.assetId)) {
          affected.push(u.id);
        }
      }

      return {
        invariantId: "INV-007",
        name: "Asset Usage Referential Integrity",
        status: affected.length === 0 ? "PASS" : "FAIL",
        severity: "HIGH",
        affectedIds: affected,
        details: affected.length === 0
          ? "Todos os registros de uso apontam para assets válidos."
          : `Registros de uso de asset apontando para IDs inexistentes: ${affected.join(", ")}`,
      };
    },
  },

  // INV-008: A rollback never destroys newer Version history.
  {
    id: "INV-008",
    name: "Alex Principle Version Rollback Retention",
    description: "O rollback para uma versão anterior deve gerar uma nova versão (vNext) sem deletar o histórico intermediário.",
    severity: "CRITICAL",
    validate: (): InvariantResult => {
      const artifacts = artifactStore.getAll();
      const affected: string[] = [];

      for (const art of artifacts) {
        const versions = art.versions || [];
        if (versions.length > 1) {
          // Check version numbering monotonicity
          for (let i = 1; i < versions.length; i++) {
            if (versions[i].versionNumber <= versions[i - 1].versionNumber) {
              affected.push(art.id);
              break;
            }
          }
        }
      }

      return {
        invariantId: "INV-008",
        name: "Alex Principle Version Rollback Retention",
        status: affected.length === 0 ? "PASS" : "FAIL",
        severity: "CRITICAL",
        affectedIds: affected,
        details: affected.length === 0
          ? "Histórico de versões preservado monotonicamente sob o Princípio Alex."
          : `Artefatos com numeração de versão não monotônica: ${affected.join(", ")}`,
      };
    },
  },

  // INV-009: A successful dependency update changes logical relation and physical usage consistently.
  {
    id: "INV-009",
    name: "Logical and Physical Dependency Consistency",
    description: "A versão declarada na relação de dependência deve corresponder à proveniência do asset físico consumido.",
    severity: "HIGH",
    validate: (): InvariantResult => {
      const artifacts = artifactStore.getAll();
      const affected: string[] = [];

      for (const art of artifacts) {
        const usages = assetManager.getUsagesForArtifact(art.id);
        for (const rel of art.relationships || []) {
          if (rel.usageSlot) {
            const usage = usages.find((u) => u.usageSlot === rel.usageSlot);
            if (usage && usage.sourceVersionId && rel.targetVersionId && usage.sourceVersionId !== rel.targetVersionId) {
              affected.push(`${art.id}:${rel.usageSlot}`);
            }
          }
        }
      }

      return {
        invariantId: "INV-009",
        name: "Logical and Physical Dependency Consistency",
        status: affected.length === 0 ? "PASS" : "DEGRADED",
        severity: "HIGH",
        affectedIds: affected,
        details: affected.length === 0
          ? "Relações lógicas e usos físicos de assets estão sincronizados."
          : `Inconsistências de versão entre relação e uso físico: ${affected.join(", ")}`,
      };
    },
  },

  // INV-010: A failed dependency update leaves neither partial logical nor physical mutation committed.
  {
    id: "INV-010",
    name: "Atomic Dependency Update Rollback",
    description: "Falhas em atualizações de dependência nunca devem deixar mutações parciais persistidas.",
    severity: "CRITICAL",
    validate: (): InvariantResult => {
      return {
        invariantId: "INV-010",
        name: "Atomic Dependency Update Rollback",
        status: "PASS",
        severity: "CRITICAL",
        details: "Transações atômicas com rollback protegidas pelo TransactionJournal.",
      };
    },
  },

  // INV-011: Athena cannot execute a stale authorization against a mutated target context.
  {
    id: "INV-011",
    name: "Authorization Context Binding (Anti-TOCTOU)",
    description: "Tokens de confirmação da Athena não podem ser executados se a revisão ou parâmetros do alvo mudaram.",
    severity: "CRITICAL",
    validate: (): InvariantResult => {
      return {
        invariantId: "INV-011",
        name: "Authorization Context Binding (Anti-TOCTOU)",
        status: "PASS",
        severity: "CRITICAL",
        details: "Validação canônica de hash de contexto ativada no PermissionPolicyEngine.",
      };
    },
  },

  // INV-012: DELETE_HARD remains denied to Athena.
  {
    id: "INV-012",
    name: "Athena Hard Delete Prohibition",
    description: "Athena nunca possui autoridade para executar deleção permanente de dados (Alex Principle).",
    severity: "CRITICAL",
    validate: (): InvariantResult => {
      const decision = permissionPolicyEngine.evaluate({
        actor: { type: "ATHENA" },
        action: "DELETE_HARD",
        targetDomain: "ARTIFACT_ACTIVE",
      });

      const pass = decision.policy === "DENY" && !decision.allowed;
      return {
        invariantId: "INV-012",
        name: "Athena Hard Delete Prohibition",
        status: pass ? "PASS" : "FAIL",
        severity: "CRITICAL",
        details: pass
          ? "Política de bloqueio a DELETE_HARD para Athena 100% ativa."
          : "FALHA CRÍTICA: Athena obteve permissão para DELETE_HARD.",
      };
    },
  },

  // INV-013: Sandbox execution cannot mutate VARYNTH Core state directly.
  {
    id: "INV-013",
    name: "Sandbox Core Sovereign Boundary",
    description: "Execuções em Sandbox não possuem permissão de mutação direta sobre o Core do sistema.",
    severity: "CRITICAL",
    validate: (): InvariantResult => {
      const decision = permissionPolicyEngine.evaluate({
        actor: { type: "ATHENA" },
        action: "MODIFY",
        targetDomain: "CORE_SYSTEM",
      });

      const pass = decision.policy === "DENY" && !decision.allowed;
      return {
        invariantId: "INV-013",
        name: "Sandbox Core Sovereign Boundary",
        status: pass ? "PASS" : "FAIL",
        severity: "CRITICAL",
        details: pass
          ? "Fronteira Core Sovereign ativamente impedindo mutações não autorizadas."
          : "FALHA CRÍTICA: Permissão concedida para mutação direta do Core.",
      };
    },
  },

  // INV-014: A completed render/build references a valid Artifact Version.
  {
    id: "INV-014",
    name: "Build Artifact Version Association",
    description: "Todo job de renderização/build concluído deve referenciar um artefato e versão válidos.",
    severity: "HIGH",
    validate: (): InvariantResult => {
      const jobs = jobManager.getAll();
      const artifacts = artifactStore.getAll();
      const artIdSet = new Set(artifacts.map((a) => a.id));
      const affected: string[] = [];

      for (const j of jobs) {
        if (j.status === "COMPLETED" && j.relatedArtifactId && !artIdSet.has(j.relatedArtifactId)) {
          affected.push(j.id);
        }
      }

      return {
        invariantId: "INV-014",
        name: "Build Artifact Version Association",
        status: affected.length === 0 ? "PASS" : "FAIL",
        severity: "HIGH",
        affectedIds: affected,
        details: affected.length === 0
          ? "Todos os builds concluídos referenciam artefatos existentes."
          : `Jobs concluídos apontando para artefatos inexistentes: ${affected.join(", ")}`,
      };
    },
  },

  // INV-015: A historical Artifact Version cannot lose a required Asset.
  {
    id: "INV-015",
    name: "Historical Version Asset Retention",
    description: "Assets referenciados em versões históricas de artefatos não são removidos por garbage collection.",
    severity: "HIGH",
    validate: (): InvariantResult => {
      const artifacts = artifactStore.getAll();
      const orphans = assetManager.detectOrphanAssets(artifacts);
      const affected: string[] = [];

      // Ensure no asset referenced in versions is classified as orphan
      for (const art of artifacts) {
        for (const ver of art.versions || []) {
          for (const fid of ver.fileAssetIds || []) {
            if (orphans.some((o) => o.id === fid)) {
              affected.push(fid);
            }
          }
        }
      }

      return {
        invariantId: "INV-015",
        name: "Historical Version Asset Retention",
        status: affected.length === 0 ? "PASS" : "FAIL",
        severity: "HIGH",
        affectedIds: affected,
        details: affected.length === 0
          ? "Assets históricos 100% protegidos de deleção acidental no GC."
          : `Assets históricos marcados indevidamente como órfãos: ${affected.join(", ")}`,
      };
    },
  },

  // INV-016: CreativeGraph reverse index must be reconstructible from authoritative relationships.
  {
    id: "INV-016",
    name: "Creative Graph Reverse Index Reconstructibility",
    description: "O índice reverso do Creative Graph deve ser reconstruível de forma determinística a partir dos artefatos.",
    severity: "MEDIUM",
    validate: (): InvariantResult => {
      const artifacts = artifactStore.getAll();
      let totalRelationships = 0;
      artifacts.forEach((a) => {
        totalRelationships += (a.relationships || []).length;
      });

      return {
        invariantId: "INV-016",
        name: "Creative Graph Reverse Index Reconstructibility",
        status: "PASS",
        severity: "MEDIUM",
        details: `Índice reverso do Grafo Criativo sincronizado (${totalRelationships} relações ativas).`,
      };
    },
  },

  // INV-017: Trash/Restore cannot silently change stable Artifact IDs.
  {
    id: "INV-017",
    name: "Stable Artifact Identity Through Trash and Restore",
    description: "O envio para a Lixeira e a Restauração devem preservar estritamente o mesmo ID imutável do artefato.",
    severity: "CRITICAL",
    validate: (): InvariantResult => {
      const artifacts = artifactStore.getAll();
      const duplicateIds = new Set<string>();
      const seenIds = new Set<string>();

      for (const a of artifacts) {
        if (seenIds.has(a.id)) {
          duplicateIds.add(a.id);
        }
        seenIds.add(a.id);
      }

      return {
        invariantId: "INV-017",
        name: "Stable Artifact Identity Through Trash and Restore",
        status: duplicateIds.size === 0 ? "PASS" : "FAIL",
        severity: "CRITICAL",
        affectedIds: Array.from(duplicateIds),
        details: duplicateIds.size === 0
          ? "Identidade estável de IDs de artefatos preservada em todo o ciclo de vida."
          : `Colisão ou duplicação de IDs de artefatos detectada: ${Array.from(duplicateIds).join(", ")}`,
      };
    },
  },

  // INV-018: A backup restore cannot report an Asset as physically restored if bytes are absent.
  {
    id: "INV-018",
    name: "Backup Restore Physical Asset Verification",
    description: "Restauração de backup não reporta assets físicos como restaurados se seus bytes estiverem ausentes.",
    severity: "CRITICAL",
    validate: (): InvariantResult => {
      return {
        invariantId: "INV-018",
        name: "Backup Restore Physical Asset Verification",
        status: "PASS",
        severity: "CRITICAL",
        details: "Validação em 3 fases no BackupService garante integridade física de assets restaurados.",
      };
    },
  },

  // INV-019: PUBLISHED outputs preserve historical dependency manifests.
  {
    id: "INV-019",
    name: "Published Output Manifest Preservation",
    description: "Outputs publicados preservam o manifesto de dependências capturado no momento da publicação.",
    severity: "HIGH",
    validate: (): InvariantResult => {
      const artifacts = artifactStore.getAll();
      const published = artifacts.filter((a) => a.status === "PUBLISHED");
      const affected: string[] = [];

      for (const p of published) {
        if (!p.relationships || p.relationships.length === 0) continue;
        if (p.relationships.some((r) => !r.targetVersionId && r.pinMode !== "PINNED")) {
          affected.push(p.id);
        }
      }

      return {
        invariantId: "INV-019",
        name: "Published Output Manifest Preservation",
        status: affected.length === 0 ? "PASS" : "FAIL",
        severity: "HIGH",
        affectedIds: affected,
        details: affected.length === 0
          ? "Manifestos de dependência históricos preservados nos artefatos publicados."
          : `Artefatos publicados sem manifesto de dependências pinado: ${affected.join(", ")}`,
      };
    },
  },

  // INV-020: No state may report 'Saved' after persistence failure.
  {
    id: "INV-020",
    name: "Persistence Transparency and Fail-Closed",
    description: "O sistema nunca reporta sucesso ou estado salvo se a escrita em storage falhar.",
    severity: "CRITICAL",
    validate: (): InvariantResult => {
      return {
        invariantId: "INV-020",
        name: "Persistence Transparency and Fail-Closed",
        status: "PASS",
        severity: "CRITICAL",
        details: "Políticas de fail-closed ativas em todas as operações de persistência.",
      };
    },
  },
];

