import { artifactStore } from "./artifact-store";
import { versionManager } from "./version-manager";
import { permissionPolicyEngine } from "../permissions/permission-policy";
import { athenaEventBus } from "../athena/events/event-bus";
import {
  Artifact,
  ArtifactType,
  ArtifactStatus,
  ArtifactActor,
  ArtifactRelationshipType,
  ArtifactFilter,
  ArtifactProvenance,
} from "./types";

export class ArtifactService {
  public createArtifact(params: {
    name: string;
    type: ArtifactType;
    description?: string;
    projectId?: string;
    status?: ArtifactStatus;
    createdBy?: ArtifactActor;
    provenance?: Partial<ArtifactProvenance>;
    tags?: string[];
    metadata?: Record<string, unknown>;
    assetFileIds?: string[];
  }): { success: boolean; error?: string; artifact?: Artifact } {
    const actor = params.createdBy || "USER";
    const status = params.status || "DRAFT";

    // 1. Permission Evaluation
    const targetDomain = status === "DRAFT" ? "ARTIFACT_DRAFT" : "ARTIFACT_ACTIVE";
    const perm = permissionPolicyEngine.evaluate(actor, "CREATE", targetDomain);
    if (!perm.allowed) {
      return { success: false, error: `Permissão negada: ${perm.reason}` };
    }

    const now = new Date().toISOString();
    const id = `art-${params.type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newArtifact: Artifact = {
      id,
      name: params.name,
      type: params.type,
      description: params.description,
      projectId: params.projectId,
      status,
      createdBy: actor,
      createdAt: now,
      updatedAt: now,
      currentVersionNumber: 0,
      versions: [],
      relationships: [],
      provenance: {
        creator: actor,
        creatorDetails: params.provenance?.creatorDetails,
        requestedBy: params.provenance?.requestedBy,
        sourceContext: params.provenance?.sourceContext,
        derivedFromArtifactIds: params.provenance?.derivedFromArtifactIds || [],
        generationPrompt: params.provenance?.generationPrompt,
        engineUsed: params.provenance?.engineUsed,
        sandboxRunId: params.provenance?.sandboxRunId,
      },
      assetFileIds: params.assetFileIds || [],
      metadata: params.metadata || {},
      tags: params.tags || [],
    };

    // 2. Create Initial Version Snapshot (v1.0)
    versionManager.createSnapshot(
      newArtifact,
      "Criação inicial do artefato no VARYNTH Universe",
      actor,
      "v1.0 - Criação Inicial"
    );

    // 3. Save to Persistent Store
    const saved = artifactStore.save(newArtifact);

    // 4. Emit Domain Event
    athenaEventBus.emit("ARTIFACT_CREATED", {
      artifactId: saved.id,
      name: saved.name,
      type: saved.type,
      actor,
    });

    return { success: true, artifact: saved };
  }

  public updateArtifact(
    id: string,
    updates: Partial<Pick<Artifact, "name" | "description" | "status" | "tags" | "metadata" | "assetFileIds">>,
    changeSummary: string,
    actor: ArtifactActor = "USER"
  ): { success: boolean; error?: string; artifact?: Artifact } {
    const existing = artifactStore.getById(id);
    if (!existing) {
      return { success: false, error: `Artefato com ID ${id} não encontrado` };
    }

    // Permission Check
    const targetDomain = existing.status === "DRAFT" ? "ARTIFACT_DRAFT" : "ARTIFACT_ACTIVE";
    const perm = permissionPolicyEngine.evaluate(actor, "MODIFY", targetDomain);
    if (!perm.allowed) {
      return { success: false, error: `Permissão negada: ${perm.reason}` };
    }

    // Asset Consistency Validation
    const nextStatus = updates.status || existing.status;
    const mediaTypes: ArtifactType[] = ["VIDEO", "GAME", "AUDIO", "IMAGE"];
    const assetList = updates.assetFileIds || existing.assetFileIds || [];
    if (nextStatus === "ACTIVE" && mediaTypes.includes(existing.type) && assetList.length === 0) {
      return {
        success: false,
        error: `Consistência violada: Artefato de mídia (${existing.type}) não pode se tornar ACTIVE sem assets físicos vinculados.`,
      };
    }

    // Apply updates
    if (updates.name) existing.name = updates.name;
    if (updates.description !== undefined) existing.description = updates.description;
    if (updates.status) existing.status = updates.status;
    if (updates.tags) existing.tags = updates.tags;
    if (updates.metadata) existing.metadata = { ...existing.metadata, ...updates.metadata };
    if (updates.assetFileIds) existing.assetFileIds = updates.assetFileIds;

    // Create new Version Snapshot
    versionManager.createSnapshot(existing, changeSummary, actor);

    // Save and Emit
    const saved = artifactStore.save(existing);
    athenaEventBus.emit("ARTIFACT_UPDATED", {
      artifactId: saved.id,
      version: saved.currentVersionNumber,
      summary: changeSummary,
      actor,
    });

    return { success: true, artifact: saved };
  }

  public linkRelationship(
    sourceArtifactId: string,
    targetArtifactId: string,
    type: ArtifactRelationshipType,
    description?: string
  ): { success: boolean; error?: string } {
    const source = artifactStore.getById(sourceArtifactId);
    const target = artifactStore.getById(targetArtifactId);

    if (!source || !target) {
      return { success: false, error: "Artefato de origem ou destino inexistente" };
    }

    // Avoid duplicate relations
    if (!source.relationships) source.relationships = [];
    const exists = source.relationships.some(
      (r) => r.targetArtifactId === targetArtifactId && r.type === type
    );

    if (!exists) {
      source.relationships.push({
        targetArtifactId,
        type,
        description,
        createdAt: new Date().toISOString(),
      });
      artifactStore.save(source);

      athenaEventBus.emit("ARTIFACT_RELATIONSHIP_LINKED", {
        sourceId: sourceArtifactId,
        targetId: targetArtifactId,
        type,
      });
    }

    return { success: true };
  }

  public rollbackArtifactVersion(
    id: string,
    targetVersionNumber: number,
    actor: ArtifactActor = "USER"
  ): { success: boolean; error?: string; artifact?: Artifact } {
    const existing = artifactStore.getById(id);
    if (!existing) {
      return { success: false, error: "Artefato não encontrado" };
    }

    const result = versionManager.rollbackToVersion(existing, targetVersionNumber, actor);
    if (!result.success || !result.rolledBackArtifact) {
      return { success: false, error: result.error };
    }

    const saved = artifactStore.save(result.rolledBackArtifact);
    athenaEventBus.emit("ARTIFACT_VERSION_SNAPSHOTTED", {
      artifactId: saved.id,
      rolledBackToVersion: targetVersionNumber,
      currentVersion: saved.currentVersionNumber,
    });

    return { success: true, artifact: saved };
  }

  public listAll(filter?: ArtifactFilter): Artifact[] {
    const all = artifactStore.getAll();
    if (!filter || filter === "ALL") return all;

    return all.filter((a) => a.type === filter || a.status === filter);
  }

  public getById(id: string): Artifact | undefined {
    return artifactStore.getById(id);
  }

  public removeArtifact(id: string, actor: ArtifactActor = "USER"): { success: boolean; error?: string } {
    const perm = permissionPolicyEngine.evaluate(actor, "DELETE", "ARTIFACT_ACTIVE");
    if (!perm.allowed) {
      return { success: false, error: `Permissão negada: ${perm.reason}` };
    }

    const removed = artifactStore.remove(id);
    return { success: removed };
  }
}

export const artifactService = new ArtifactService();

