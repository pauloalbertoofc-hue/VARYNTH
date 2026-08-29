import {
  Artifact,
  ArtifactType,
  ArtifactStatus,
  ArtifactActor,
  ArtifactRelationshipType,
  ArtifactFilter,
  ArtifactProvenance,
} from "./types";
import { artifactStore } from "./artifact-store";
import { versionManager } from "./version-manager";
import { assetManager } from "./asset-manager";
import { permissionPolicyEngine } from "../permissions/permission-policy";
import { athenaEventBus } from "../athena/events/event-bus";

export class ArtifactService {
  public async createArtifact(
    params: {
      type: ArtifactType;
      name: string;
      description?: string;
      projectId?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
      provenance?: Partial<ArtifactProvenance>;
      assetFileIds?: string[];
    },
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; artifact?: Artifact; error?: string }> {
    // 1. Permission Policy Check
    const perm = permissionPolicyEngine.evaluate({
      actor: { type: actor },
      action: "CREATE",
      targetDomain: "ARTIFACT_DRAFT",
      resourceStatus: "DRAFT",
    });

    if (!perm.allowed) {
      return { success: false, error: `[PERMISSÃO NEGADA] ${perm.reason}` };
    }

    const now = new Date().toISOString();
    const id = `art-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const artifact: Artifact = {
      id,
      type: params.type,
      name: params.name,
      description: params.description,
      projectId: params.projectId,
      status: "DRAFT", // Always created in DRAFT initially

      createdBy: actor,
      createdAt: now,
      updatedAt: now,

      currentVersionNumber: 0,
      versions: [],
      relationships: [],
      provenance: {
        creator: actor,
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

    // 2. Initial v1.0 Snapshot (Alex Principle)
    versionManager.createSnapshot(artifact, "Criação inicial do artefato em status DRAFT (v1.0)", actor);

    // 3. Persistence
    const saved = artifactStore.save(artifact);

    athenaEventBus.emit("ARTIFACT_CREATED", {
      artifactId: saved.id,
      type: saved.type,
      name: saved.name,
      createdBy: actor,
    });

    return { success: true, artifact: saved };
  }

  public async updateArtifact(
    id: string,
    updates: Partial<Pick<Artifact, "name" | "description" | "metadata" | "tags" | "assetFileIds">>,
    actor: ArtifactActor = "USER",
    changeSummary = "Modificação estrutural do artefato",
    skipSnapshot = false
  ): Promise<{ success: boolean; artifact?: Artifact; requiresConfirmation?: boolean; error?: string }> {
    const artifact = artifactStore.getById(id);
    if (!artifact) {
      return { success: false, error: `Artefato com ID ${id} não encontrado.` };
    }

    // 1. Permission Check
    const perm = permissionPolicyEngine.evaluate({
      actor: { type: actor },
      action: "MODIFY",
      targetDomain: artifact.status === "ACTIVE" ? "ARTIFACT_ACTIVE" : artifact.status === "PUBLISHED" ? "ARTIFACT_PUBLISHED" : "ARTIFACT_DRAFT",
      resourceStatus: artifact.status,
    });

    if (!perm.allowed && perm.policy === "DENY") {
      return { success: false, error: `[PERMISSÃO NEGADA] ${perm.reason}` };
    }

    if (perm.requiresConfirmation) {
      return { success: false, requiresConfirmation: true, error: `[CONFIRMAÇÃO NECESSÁRIA] ${perm.reason}` };
    }

    // 2. Create version snapshot before applying changes (Safety Snapshot)
    if (!skipSnapshot) {
      versionManager.createSnapshot(artifact, changeSummary, actor);
    }

    // 3. Apply updates
    if (updates.name) artifact.name = updates.name;
    if (updates.description !== undefined) artifact.description = updates.description;
    if (updates.metadata) artifact.metadata = { ...artifact.metadata, ...updates.metadata };
    if (updates.tags) artifact.tags = updates.tags;
    if (updates.assetFileIds) artifact.assetFileIds = updates.assetFileIds;
    artifact.updatedAt = new Date().toISOString();

    const saved = artifactStore.save(artifact);

    athenaEventBus.emit("ARTIFACT_UPDATED", {
      artifactId: saved.id,
      versionNumber: saved.currentVersionNumber,
      updatedBy: actor,
    });

    return { success: true, artifact: saved };
  }

  public async transitionStatus(
    id: string,
    newStatus: ArtifactStatus,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; artifact?: Artifact; error?: string }> {
    const artifact = artifactStore.getById(id);
    if (!artifact) {
      return { success: false, error: `Artefato com ID ${id} não encontrado.` };
    }

    // 1. Validate status transition
    if (newStatus === "ACTIVE") {
      const assetCheck = await assetManager.validateRequiredAssets(artifact);
      if (!assetCheck.valid) {
        return {
          success: false,
          error: `[CONSISTÊNCIA DE ASSETS] Artefato ${artifact.type} não pode se tornar ACTIVE sem assets físicos vinculados: ${assetCheck.missingAssets.join(", ")}`,
        };
      }
    }

    if (newStatus === "PUBLISHED") {
      const perm = permissionPolicyEngine.evaluate({
        actor: { type: actor },
        action: "PUBLISH",
        targetDomain: "ARTIFACT_PUBLISHED",
        resourceStatus: "ACTIVE",
      });

      if (!perm.allowed && perm.policy === "DENY") {
        return { success: false, error: `[PERMISSÃO NEGADA] ${perm.reason}` };
      }
    }

    // 2. Version snapshot on transition
    versionManager.createSnapshot(artifact, `Transição de status: ${artifact.status} ──► ${newStatus}`, actor);

    artifact.status = newStatus;
    artifact.updatedAt = new Date().toISOString();

    const saved = artifactStore.save(artifact);

    athenaEventBus.emit("ARTIFACT_UPDATED", {
      artifactId: saved.id,
      newStatus,
      updatedBy: actor,
    });

    return { success: true, artifact: saved };
  }

  public addRelationship(
    sourceArtifactId: string,
    targetArtifactId: string,
    type: ArtifactRelationshipType,
    description?: string
  ): { success: boolean; error?: string } {
    const source = artifactStore.getById(sourceArtifactId);
    const target = artifactStore.getById(targetArtifactId);

    if (!source || !target) {
      return { success: false, error: "Um ou ambos os artefatos da relação não existem." };
    }

    const relationship = {
      targetArtifactId,
      type,
      description,
      createdAt: new Date().toISOString(),
    };

    source.relationships = [...(source.relationships || []), relationship];
    artifactStore.save(source);

    athenaEventBus.emit("ARTIFACT_RELATIONSHIP_LINKED", {
      sourceId: sourceArtifactId,
      targetId: targetArtifactId,
      relationshipType: type,
    });

    return { success: true };
  }

  public restoreVersion(
    artifactId: string,
    versionNumber: number,
    actor: ArtifactActor = "USER"
  ): { success: boolean; artifact?: Artifact; error?: string } {
    const artifact = artifactStore.getById(artifactId);
    if (!artifact) {
      return { success: false, error: `Artefato com ID ${artifactId} não encontrado.` };
    }

    const res = versionManager.rollbackToVersion(artifact, versionNumber, actor);
    if (!res.success || !res.rolledBackArtifact) {
      return { success: false, error: res.error };
    }

    const saved = artifactStore.save(res.rolledBackArtifact);
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

  public async removeArtifact(id: string, actor: ArtifactActor = "USER"): Promise<{ success: boolean; error?: string }> {
    const perm = permissionPolicyEngine.evaluate({
      actor: { type: actor },
      action: "DELETE_SOFT",
      targetDomain: "ARTIFACT_ACTIVE",
    });

    if (!perm.allowed && perm.policy === "DENY") {
      return { success: false, error: `[PERMISSÃO NEGADA] ${perm.reason}` };
    }

    const artifact = artifactStore.getById(id);
    if (!artifact) return { success: false, error: "Artefato não encontrado" };

    // Soft delete preserving versions and assets
    artifact.status = "TRASHED";
    artifactStore.save(artifact);

    return { success: true };
  }

  public async moveToTrash(id: string, actor: ArtifactActor = "USER"): Promise<{ success: boolean; error?: string }> {
    return this.removeArtifact(id, actor);
  }

  public async restoreFromTrash(id: string, actor: ArtifactActor = "USER"): Promise<{ success: boolean; artifact?: Artifact; error?: string }> {
    const artifact = artifactStore.getById(id);
    if (!artifact) return { success: false, error: "Artefato não encontrado" };
    artifact.status = "DRAFT";
    const saved = artifactStore.save(artifact);
    return { success: true, artifact: saved };
  }

  public async linkRelationship(
    sourceId: string,
    relationship: { targetArtifactId: string; type: ArtifactRelationshipType; description?: string },
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    return this.addRelationship(sourceId, relationship.targetArtifactId, relationship.type, relationship.description);
  }
}

export const artifactService = new ArtifactService();
