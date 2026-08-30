import {
  Artifact,
  ArtifactType,
  ArtifactStatus,
  ArtifactActor,
  ArtifactRelationshipType,
  ArtifactRelationship,
  CreativeIntegrityReport,
  CreativeEdgeType,
  VersionPinMode,
  ArtifactFilter,
  ArtifactProvenance,
} from "./types";
import { artifactStore } from "./artifact-store";
import { versionManager } from "./version-manager";
import { assetManager } from "./asset-manager";
import { creativeGraph } from "./creative-graph";
import { CreativeIntegrityValidator } from "./creative-integrity-validator";
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

  public async create(
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
  ) {
    return this.createArtifact(params, actor);
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

  public async update(
    id: string,
    updates: Partial<Pick<Artifact, "name" | "description" | "metadata" | "tags" | "assetFileIds">>,
    actor: ArtifactActor = "USER",
    changeSummary = "Modificação estrutural do artefato",
    skipSnapshot = false
  ) {
    return this.updateArtifact(id, updates, actor, changeSummary, skipSnapshot);
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
    description?: string,
    semanticRole?: string,
    usageSlot?: string,
    targetVersionId?: string,
    targetVersionNumber?: number,
    pinMode: "PINNED" | "FOLLOW_LATEST" = "PINNED"
  ): { success: boolean; error?: string } {
    return this.linkDependency(
      {
        sourceArtifactId,
        targetArtifactId,
        type,
        description,
        semanticRole,
        usageSlot,
        targetVersionId,
        targetVersionNumber,
        pinMode,
      },
      "USER"
    );
  }

  public linkDependency(
    params: {
      sourceArtifactId: string;
      targetArtifactId: string;
      type: ArtifactRelationshipType;
      semanticRole?: string;
      targetVersionId?: string;
      targetVersionNumber?: number;
      pinMode?: "PINNED" | "FOLLOW_LATEST";
      usageSlot?: string;
      description?: string;
    },
    actor: ArtifactActor = "USER"
  ): { success: boolean; error?: string } {
    const source = artifactStore.getById(params.sourceArtifactId);
    const target = artifactStore.getById(params.targetArtifactId);

    if (!source || !target) {
      return { success: false, error: "Um ou ambos os artefatos da relação não existem." };
    }

    // 1. Cycle validation
    const cycleCheck = creativeGraph.validateCycleConstraints(params.sourceArtifactId, params.targetArtifactId, params.type);
    if (!cycleCheck.valid) {
      return { success: false, error: cycleCheck.error };
    }

    // 2. Resolve version details
    const targetLatest = target.versions?.[target.versions.length - 1];
    const authoritativeVersionId = params.targetVersionId || target.currentVersionId || targetLatest?.versionId || "v1-init";
    const presentationVersionNumber = params.targetVersionNumber || target.currentVersionNumber || targetLatest?.versionNumber || 1;

    const relationship: ArtifactRelationship = {
      id: `rel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      targetArtifactId: params.targetArtifactId,
      targetVersionId: authoritativeVersionId,
      targetVersionNumber: presentationVersionNumber,
      type: params.type,
      semanticRole: params.semanticRole,
      pinMode: params.pinMode || "PINNED",
      usageSlot: params.usageSlot,
      description: params.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Remove any previous relationship for the exact same slot/target
    source.relationships = (source.relationships || []).filter(
      (r) => !(r.targetArtifactId === params.targetArtifactId && r.usageSlot === params.usageSlot)
    );
    source.relationships.push(relationship);

    artifactStore.save(source);
    creativeGraph.rebuildIndex();

    athenaEventBus.emit("ARTIFACT_RELATIONSHIP_LINKED", {
      sourceId: params.sourceArtifactId,
      targetId: params.targetArtifactId,
      relationshipType: params.type,
      targetVersionId: authoritativeVersionId,
      pinMode: relationship.pinMode,
    });

    return { success: true };
  }

  public unlinkDependency(
    sourceArtifactId: string,
    targetArtifactId: string,
    usageSlot?: string,
    actor: ArtifactActor = "USER"
  ): { success: boolean; error?: string } {
    const source = artifactStore.getById(sourceArtifactId);
    if (!source) return { success: false, error: `Artefato ${sourceArtifactId} não encontrado.` };

    source.relationships = (source.relationships || []).filter((r) => {
      if (usageSlot) {
        return !(r.targetArtifactId === targetArtifactId && r.usageSlot === usageSlot);
      }
      return r.targetArtifactId !== targetArtifactId;
    });

    artifactStore.save(source);
    creativeGraph.rebuildIndex();

    athenaEventBus.emit("ARTIFACT_UNLINKED", {
      sourceId: sourceArtifactId,
      targetId: targetArtifactId,
      usageSlot,
      actor,
    });

    return { success: true };
  }

  public setPinMode(
    sourceArtifactId: string,
    targetArtifactId: string,
    pinMode: "PINNED" | "FOLLOW_LATEST",
    targetVersionId?: string,
    actor: ArtifactActor = "USER"
  ): { success: boolean; error?: string } {
    const source = artifactStore.getById(sourceArtifactId);
    if (!source) return { success: false, error: `Artefato ${sourceArtifactId} não encontrado.` };

    const rel = (source.relationships || []).find((r) => r.targetArtifactId === targetArtifactId);
    if (!rel) return { success: false, error: `Relação com ${targetArtifactId} não encontrada.` };

    rel.pinMode = pinMode;
    if (targetVersionId) {
      rel.targetVersionId = targetVersionId;
      const target = artifactStore.getById(targetArtifactId);
      const matchedVer = target?.versions?.find((v) => v.versionId === targetVersionId);
      if (matchedVer) {
        rel.targetVersionNumber = matchedVer.versionNumber;
      }
    }
    rel.updatedAt = new Date().toISOString();

    artifactStore.save(source);
    creativeGraph.rebuildIndex();

    return { success: true };
  }

  /**
   * Transactional Dependency Update with ATOMIC_ROLLBACK
   */
  public async acceptDependencyUpdate(
    params: {
      consumerArtifactId: string;
      targetArtifactId: string;
      newVersionId: string;
      newVersionNumber: number;
      newAssetId?: string;
      usageSlot?: string;
    },
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const consumer = artifactStore.getById(params.consumerArtifactId);
    const target = artifactStore.getById(params.targetArtifactId);

    if (!consumer || !target) {
      return { success: false, error: "Consumidor ou alvo não encontrado." };
    }

    // 1. Permission check for published consumers
    if (consumer.status === "PUBLISHED") {
      const perm = permissionPolicyEngine.evaluate({
        actor: { type: actor },
        action: "MODIFY",
        targetDomain: "ARTIFACT_PUBLISHED",
        resourceStatus: "PUBLISHED",
      });
      if ((!perm.allowed && perm.policy === "DENY") || perm.requiresConfirmation || perm.policy === "CONFIRM") {
        return { success: false, error: `[PERMISSÃO NEGADA / CONFIRMAÇÃO NECESSÁRIA] ${perm.reason || "Requer confirmação do usuário."}` };
      }
    }

    // 2. Create safety snapshot of consumer artifact
    versionManager.createSnapshot(
      consumer,
      `[SAFETY SNAPSHOT] Atualização de dependência '${target.name}' para v${params.newVersionNumber}.0`,
      actor
    );

    // Save backup state for atomic rollback
    const previousConsumerJson = JSON.stringify(consumer);
    const previousUsages = assetManager.getUsagesForArtifact(consumer.id);

    try {
      // 3. Update Relationship
      const rel = (consumer.relationships || []).find(
        (r) => r.targetArtifactId === params.targetArtifactId && (!params.usageSlot || r.usageSlot === params.usageSlot)
      );

      if (rel) {
        rel.targetVersionId = params.newVersionId;
        rel.targetVersionNumber = params.newVersionNumber;
        rel.updatedAt = new Date().toISOString();
      }

      // 4. Update physical AssetUsageRecord if newAssetId provided
      if (params.newAssetId && params.usageSlot) {
        // Remove previous usage for this slot
        const oldUsage = previousUsages.find((u) => u.usageSlot === params.usageSlot);
        if (oldUsage) {
          assetManager.removeUsage(oldUsage.id);
        }

        assetManager.registerUsage({
          id: `usage-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          assetId: params.newAssetId,
          consumerArtifactId: consumer.id,
          consumerVersionId: consumer.currentVersionId || "current",
          consumerVersionNumber: consumer.currentVersionNumber || 1,
          usageSlot: params.usageSlot,
          sourceArtifactId: params.targetArtifactId,
          sourceVersionId: params.newVersionId,
          sourceVersionNumber: params.newVersionNumber,
          createdAt: new Date().toISOString(),
        });
      }

      // 5. Evaluate Creative Integrity
      artifactStore.save(consumer);
      const integrity = CreativeIntegrityValidator.evaluate(consumer.id);
      if (!integrity.valid) {
        throw new Error(
          `[ATOMIC_ROLLBACK] Integridade violada: ${integrity.issues.map((i) => i.message).join("; ")}`
        );
      }

      creativeGraph.rebuildIndex();
      athenaEventBus.emit("DEPENDENCY_UPDATED", {
        consumerId: consumer.id,
        targetId: params.targetArtifactId,
        newVersionId: params.newVersionId,
        newVersionNumber: params.newVersionNumber,
      });

      return { success: true };
    } catch (err: any) {
      // Atomic Rollback
      const restoredConsumer = JSON.parse(previousConsumerJson);
      artifactStore.save(restoredConsumer);
      creativeGraph.rebuildIndex();
      return { success: false, error: err.message };
    }
  }

  public getDependencyImpact(artifactId: string): {
    directDependentsCount: number;
    directDependents: Array<{ consumerArtifactId: string; consumerName: string; relationship: ArtifactRelationship }>;
  } {
    const dependents = creativeGraph.getDependents(artifactId);
    return {
      directDependentsCount: dependents.length,
      directDependents: dependents,
    };
  }

  public getCreativeIntegrity(artifactId: string): CreativeIntegrityReport {
    return CreativeIntegrityValidator.evaluate(artifactId);
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
    creativeGraph.rebuildIndex();
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
    creativeGraph.rebuildIndex();

    // Check impact on dependents
    const impact = this.getDependencyImpact(id);
    if (impact.directDependentsCount > 0) {
      athenaEventBus.emit("DEPENDENCY_STALE", {
        artifactId: id,
        dependentsCount: impact.directDependentsCount,
        status: "SOURCE_TRASHED",
      });
    }

    return { success: true };
  }

  public async moveToTrash(id: string, actor: ArtifactActor = "USER"): Promise<{ success: boolean; error?: string }> {
    return this.removeArtifact(id, actor);
  }

  public async trash(id: string, actor: ArtifactActor = "USER"): Promise<{ success: boolean; error?: string }> {
    return this.moveToTrash(id, actor);
  }

  public async restoreFromTrash(id: string, actor: ArtifactActor = "USER"): Promise<{ success: boolean; artifact?: Artifact; error?: string }> {
    const artifact = artifactStore.getById(id);
    if (!artifact) return { success: false, error: "Artefato não encontrado" };
    artifact.status = "DRAFT";
    const saved = artifactStore.save(artifact);
    creativeGraph.rebuildIndex();

    athenaEventBus.emit("DEPENDENCY_RESTORED", { artifactId: id });
    return { success: true, artifact: saved };
  }

  public async linkRelationship(
    sourceId: string,
    relationship: { targetArtifactId: string; type: ArtifactRelationshipType; description?: string; semanticRole?: string; usageSlot?: string; targetVersionId?: string; targetVersionNumber?: number; pinMode?: "PINNED" | "FOLLOW_LATEST" },
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    return this.linkDependency(
      {
        sourceArtifactId: sourceId,
        targetArtifactId: relationship.targetArtifactId,
        type: relationship.type,
        description: relationship.description,
        semanticRole: relationship.semanticRole,
        usageSlot: relationship.usageSlot,
        targetVersionId: relationship.targetVersionId,
        targetVersionNumber: relationship.targetVersionNumber,
        pinMode: relationship.pinMode,
      },
      actor
    );
  }
}

export const artifactService = new ArtifactService();
