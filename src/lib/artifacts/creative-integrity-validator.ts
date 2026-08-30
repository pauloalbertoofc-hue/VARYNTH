import {
  Artifact,
  ArtifactRelationship,
  CreativeIntegrityReport,
  CreativeIntegrityIssue,
  DependencyHealthStatus,
} from "./types";
import { artifactStore } from "./artifact-store";
import { assetManager } from "./asset-manager";

export class CreativeIntegrityValidator {
  /**
   * Evaluates the complete cross-studio creative integrity of a specific artifact
   */
  public static evaluate(artifactId: string): CreativeIntegrityReport {
    const art = artifactStore.getById(artifactId);
    const issues: CreativeIntegrityIssue[] = [];
    const now = new Date().toISOString();

    if (!art) {
      return {
        artifactId,
        overallHealth: "SOURCE_MISSING",
        valid: false,
        issues: [
          {
            code: "SOURCE_MISSING",
            sourceArtifactId: artifactId,
            message: `Artefato '${artifactId}' não encontrado no armazenamento.`,
            severity: "ERROR",
          },
        ],
        evaluatedAt: now,
      };
    }

    const rels: ArtifactRelationship[] = art.relationships || [];
    const usages = assetManager.getUsagesForArtifact(artifactId);

    // 1. Evaluate each declared relationship
    for (const rel of rels) {
      const target = artifactStore.getById(rel.targetArtifactId);

      // 1.1 Source Missing
      if (!target) {
        issues.push({
          code: "SOURCE_MISSING",
          sourceArtifactId: artifactId,
          targetArtifactId: rel.targetArtifactId,
          usageSlot: rel.usageSlot,
          message: `Artefato dependente '${rel.targetArtifactId}' não existe no sistema.`,
          severity: "ERROR",
          suggestedAction: "Desvincular dependência ou restaurar artefato.",
        });
        continue;
      }

      // 1.2 Source Trashed
      if (target.status === "TRASHED") {
        issues.push({
          code: "SOURCE_TRASHED",
          sourceArtifactId: artifactId,
          targetArtifactId: target.id,
          usageSlot: rel.usageSlot,
          message: `Artefato de origem '${target.name}' está na Lixeira.`,
          severity: "WARNING",
          suggestedAction: "Restaurar artefato da Lixeira ou substituir dependência.",
        });
      }

      // 1.3 Update Available (Stale Dependency Check)
      const targetLatestVersion = target.versions?.[target.versions.length - 1];
      const targetLatestVersionNumber = target.currentVersionNumber || targetLatestVersion?.versionNumber || 1;
      const targetLatestVersionId = target.currentVersionId || targetLatestVersion?.versionId;

      const isStaleNum = (rel.targetVersionNumber || 1) < targetLatestVersionNumber;
      const isStaleId = Boolean(rel.targetVersionId && targetLatestVersionId && rel.targetVersionId !== targetLatestVersionId);

      if (
        target.status !== "TRASHED" &&
        target.status !== "FAILED" &&
        (rel.pinMode === "PINNED" || !rel.pinMode) &&
        (isStaleNum || isStaleId)
      ) {
        issues.push({
          code: "UPDATE_AVAILABLE",
          sourceArtifactId: artifactId,
          targetArtifactId: target.id,
          targetVersionId: targetLatestVersionId,
          usageSlot: rel.usageSlot,
          message: `Nova versão disponível para '${target.name}': v${targetLatestVersionNumber}.0 (atual pinado: v${rel.targetVersionNumber || 1}.0).`,
          severity: "INFO",
          suggestedAction: "Revisar e aceitar atualização de dependência.",
        });
      }

      // 1.4 Version Mismatch & Alignment Check
      // If a physical asset is used for this slot, verify that its sourceVersionId matches the relationship targetVersionId
      if (rel.usageSlot) {
        const slotUsage = usages.find((u) => u.usageSlot === rel.usageSlot);
        if (slotUsage && slotUsage.sourceVersionId && rel.targetVersionId) {
          if (slotUsage.sourceVersionId !== rel.targetVersionId) {
            issues.push({
              code: "VERSION_MISMATCH",
              sourceArtifactId: artifactId,
              targetArtifactId: target.id,
              targetVersionId: rel.targetVersionId,
              assetId: slotUsage.assetId,
              usageSlot: rel.usageSlot,
              message: `Divergência de versão no slot '${rel.usageSlot}': relação aponta para versão '${rel.targetVersionId}', mas o asset físico foi gerado a partir da versão '${slotUsage.sourceVersionId}'.`,
              severity: "ERROR",
              suggestedAction: "Re-renderizar asset a partir da versão correta ou reajustar o pin.",
            });
          }
        }
      }
    }

    // 2. Evaluate physical Asset Usages
    for (const usage of usages) {
      const assetFile = assetManager.getAsset(usage.assetId);

      // 2.1 Physical Asset Missing
      if (!assetFile) {
        issues.push({
          code: "ASSET_MISSING",
          sourceArtifactId: artifactId,
          assetId: usage.assetId,
          usageSlot: usage.usageSlot,
          message: `Asset físico '${usage.assetId}' utilizado no slot '${usage.usageSlot}' não foi encontrado no AssetManager.`,
          severity: "ERROR",
          suggestedAction: "Re-importar ou re-renderizar o asset ausente.",
        });
      }
    }

    // Determine overall health
    let overallHealth: DependencyHealthStatus = "VALID";
    if (issues.some((i) => i.code === "SOURCE_MISSING")) {
      overallHealth = "SOURCE_MISSING";
    } else if (issues.some((i) => i.code === "ASSET_MISSING")) {
      overallHealth = "ASSET_MISSING";
    } else if (issues.some((i) => i.code === "VERSION_MISMATCH")) {
      overallHealth = "VERSION_MISMATCH";
    } else if (issues.some((i) => i.code === "SOURCE_TRASHED")) {
      overallHealth = "SOURCE_TRASHED";
    } else if (issues.some((i) => i.code === "UPDATE_AVAILABLE")) {
      overallHealth = "UPDATE_AVAILABLE";
    } else if (issues.some((i) => i.code === "UNUSED_DEPENDENCY")) {
      overallHealth = "UNUSED_DEPENDENCY";
    }

    const valid = !issues.some((i) => i.severity === "ERROR");

    return {
      artifactId,
      overallHealth,
      valid,
      issues,
      evaluatedAt: now,
    };
  }

  /**
   * Evaluates all artifacts and returns a health summary
   */
  public static evaluateAll(): Record<string, CreativeIntegrityReport> {
    const all = artifactStore.getAll();
    const result: Record<string, CreativeIntegrityReport> = {};
    for (const art of all) {
      result[art.id] = this.evaluate(art.id);
    }
    return result;
  }
}
