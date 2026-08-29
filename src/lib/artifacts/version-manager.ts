import { Artifact, ArtifactVersion, ArtifactActor } from "./types";

export class VersionManager {
  public createSnapshot(
    artifact: Artifact,
    changeSummary: string,
    createdBy: ArtifactActor = "USER",
    label?: string
  ): ArtifactVersion {
    const nextVersionNumber = (artifact.currentVersionNumber || 0) + 1;
    const versionId = `ver-${artifact.id}-v${nextVersionNumber}-${Date.now()}`;

    const snapshotData: Record<string, unknown> = {
      name: artifact.name,
      description: artifact.description,
      status: artifact.status,
      metadata: JSON.parse(JSON.stringify(artifact.metadata || {})),
      tags: [...artifact.tags],
      assetFileIds: [...artifact.assetFileIds],
      relationships: JSON.parse(JSON.stringify(artifact.relationships || [])),
    };

    const newVersion: ArtifactVersion = {
      versionId,
      versionNumber: nextVersionNumber,
      label: label || `Versão ${nextVersionNumber}.0`,
      createdAt: new Date().toISOString(),
      createdBy,
      changeSummary,
      snapshotData,
      fileAssetIds: [...artifact.assetFileIds],
    };

    artifact.versions = [...(artifact.versions || []), newVersion];
    artifact.currentVersionId = versionId;
    artifact.currentVersionNumber = nextVersionNumber;
    artifact.updatedAt = new Date().toISOString();

    return JSON.parse(JSON.stringify(newVersion));
  }

  public rollbackToVersion(
    artifact: Artifact,
    targetVersionNumber: number,
    actor: ArtifactActor = "USER"
  ): { success: boolean; error?: string; rolledBackArtifact?: Artifact } {
    const targetVersion = artifact.versions?.find((v) => v.versionNumber === targetVersionNumber);
    if (!targetVersion) {
      return { success: false, error: `Versão v${targetVersionNumber} não encontrada no artefato ${artifact.id}` };
    }

    // 1. Create a safety snapshot of current state before rollback
    this.createSnapshot(
      artifact,
      `Snapshot de segurança antes de rollback para v${targetVersionNumber}`,
      actor,
      `Pré-Rollback (v${artifact.currentVersionNumber})`
    );

    // 2. Restore state from target snapshot
    const data = targetVersion.snapshotData;
    if (data.name) artifact.name = data.name as string;
    if (data.description !== undefined) artifact.description = data.description as string;
    if (data.status) artifact.status = data.status as any;
    if (data.metadata) artifact.metadata = JSON.parse(JSON.stringify(data.metadata));
    if (data.tags) artifact.tags = [...(data.tags as string[])];
    if (data.assetFileIds) artifact.assetFileIds = [...(data.assetFileIds as string[])];
    if (data.relationships) artifact.relationships = JSON.parse(JSON.stringify(data.relationships));

    // 3. Increment version to mark the rollback
    const rollbackVersion = this.createSnapshot(
      artifact,
      `Rollback restaurado a partir da v${targetVersionNumber}`,
      actor,
      `Rollback v${targetVersionNumber}`
    );

    return {
      success: true,
      rolledBackArtifact: JSON.parse(JSON.stringify(artifact)),
    };
  }

  public compareVersions(
    artifact: Artifact,
    v1Number: number,
    v2Number: number
  ): {
    v1?: ArtifactVersion;
    v2?: ArtifactVersion;
    differences: Record<string, { before: unknown; after: unknown }>;
  } {
    const v1 = artifact.versions?.find((v) => v.versionNumber === v1Number);
    const v2 = artifact.versions?.find((v) => v.versionNumber === v2Number);

    const differences: Record<string, { before: unknown; after: unknown }> = {};

    if (!v1 || !v2) {
      return { v1, v2, differences };
    }

    const d1 = v1.snapshotData;
    const d2 = v2.snapshotData;

    const allKeys = Array.from(new Set([...Object.keys(d1), ...Object.keys(d2)]));
    allKeys.forEach((key) => {
      const s1 = JSON.stringify(d1[key]);
      const s2 = JSON.stringify(d2[key]);
      if (s1 !== s2) {
        differences[key] = { before: d1[key], after: d2[key] };
      }
    });

    return { v1, v2, differences };
  }
}

export const versionManager = new VersionManager();

