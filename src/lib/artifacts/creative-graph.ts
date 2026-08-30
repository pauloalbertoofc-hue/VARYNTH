import {
  Artifact,
  ArtifactRelationship,
  CreativeEdgeType,
  AssetUsageRecord,
  DependencyHealthStatus,
} from "./types";
import { artifactStore } from "./artifact-store";
import { assetManager } from "./asset-manager";

export interface CreativeProvenanceNode {
  artifactId: string;
  artifactName: string;
  artifactType: string;
  versionId?: string;
  versionNumber: number;
  relationshipType?: CreativeEdgeType;
  semanticRole?: string;
  ancestors: CreativeProvenanceNode[];
  usedAssets: Array<{
    assetId: string;
    assetName?: string;
    usageSlot: string;
    sourceArtifactId?: string;
    sourceVersionId?: string;
  }>;
}

export interface CreativeGraphNode {
  id: string;
  artifactId: string;
  name: string;
  type: string;
  status: string;
  currentVersionNumber: number;
  currentVersionId?: string;
  projectId?: string;
  health: DependencyHealthStatus;
  dependencyCount: number;
  dependentCount: number;
}

export interface CreativeGraphEdge {
  id: string;
  sourceArtifactId: string;
  targetArtifactId: string;
  type: CreativeEdgeType;
  semanticRole?: string;
  pinMode: "PINNED" | "FOLLOW_LATEST";
  targetVersionId?: string;
  targetVersionNumber?: number;
  health: DependencyHealthStatus;
}

export class CreativeGraphEngine {
  // Authoritative in-memory reverse index: targetArtifactId -> List of (consumer + rel)
  private reverseIndex: Map<
    string,
    Array<{ consumerArtifactId: string; consumerName: string; relationship: ArtifactRelationship }>
  > = new Map();

  constructor() {
    this.rebuildIndex();
  }

  /**
   * Rebuilds the authoritative reverse index from artifact store
   */
  public rebuildIndex(): void {
    this.reverseIndex.clear();
    const artifacts = artifactStore.getAll();

    for (const art of artifacts) {
      if (art.relationships && Array.isArray(art.relationships)) {
        for (const rel of art.relationships) {
          const list = this.reverseIndex.get(rel.targetArtifactId) || [];
          list.push({
            consumerArtifactId: art.id,
            consumerName: art.name,
            relationship: JSON.parse(JSON.stringify(rel)),
          });
          this.reverseIndex.set(rel.targetArtifactId, list);
        }
      }
    }
  }

  /**
   * Returns all direct outgoing dependencies declared by an artifact
   */
  public getDependencies(artifactId: string): ArtifactRelationship[] {
    const art = artifactStore.getById(artifactId);
    return art && art.relationships ? JSON.parse(JSON.stringify(art.relationships)) : [];
  }

  /**
   * Returns all direct incoming dependents (consumers) of an artifact
   */
  public getDependents(
    targetArtifactId: string
  ): Array<{ consumerArtifactId: string; consumerName: string; relationship: ArtifactRelationship }> {
    this.rebuildIndex();
    return this.reverseIndex.get(targetArtifactId) || [];
  }

  /**
   * Traces the recursive provenance tree up to a maximum depth
   */
  public getProvenanceChain(artifactId: string, maxDepth = 10): CreativeProvenanceNode | null {
    const art = artifactStore.getById(artifactId);
    if (!art) return null;

    const visited = new Set<string>();

    const traceNode = (currentId: string, depth: number): CreativeProvenanceNode | null => {
      if (depth > maxDepth || visited.has(currentId)) return null;
      visited.add(currentId);

      const a = artifactStore.getById(currentId);
      if (!a) return null;

      const ancestors: CreativeProvenanceNode[] = [];
      const rels = a.relationships || [];

      for (const rel of rels) {
        // Trace ancestral types (DERIVED_FROM, SCRIPT_FROM, GENERATED_FROM, DEPENDS_ON)
        if (["DERIVED_FROM", "GENERATED_FROM", "DEPENDS_ON", "SOURCE_OF", "USES"].includes(rel.type)) {
          const anc = traceNode(rel.targetArtifactId, depth + 1);
          if (anc) {
            anc.relationshipType = rel.type;
            anc.semanticRole = rel.semanticRole;
            ancestors.push(anc);
          }
        }
      }

      const usages = assetManager.getUsagesForArtifact(currentId);
      const usedAssets = usages.map((u) => {
        const file = assetManager.getAsset(u.assetId);
        return {
          assetId: u.assetId,
          assetName: file?.name,
          usageSlot: u.usageSlot,
          sourceArtifactId: u.sourceArtifactId,
          sourceVersionId: u.sourceVersionId,
        };
      });

      return {
        artifactId: a.id,
        artifactName: a.name,
        artifactType: a.type,
        versionId: a.currentVersionId,
        versionNumber: a.currentVersionNumber || 1,
        ancestors,
        usedAssets,
      };
    };

    return traceNode(artifactId, 0);
  }

  /**
   * Validates cycle constraints based on edge semantics.
   * Strict acyclic DAG is enforced for DERIVED_FROM, GENERATED_FROM, PRODUCES.
   * Associative cycles are permitted for REFERENCES, RELATED_TO.
   */
  public validateCycleConstraints(
    sourceArtifactId: string,
    targetArtifactId: string,
    edgeType: CreativeEdgeType
  ): { valid: boolean; error?: string } {
    // Self-reference check
    if (sourceArtifactId === targetArtifactId) {
      return { valid: false, error: `[CICLO AUTO-REFERENCIAL] Artefato ${sourceArtifactId} não pode apontar para si mesmo.` };
    }

    // Associative references allow mutual cycles
    if (["REFERENCES", "RELATED_TO"].includes(edgeType)) {
      return { valid: true };
    }

    // Strict derivation types must remain acyclic
    if (["DERIVED_FROM", "GENERATED_FROM", "PRODUCES", "DEPENDS_ON"].includes(edgeType)) {
      const visited = new Set<string>();
      const queue: string[] = [targetArtifactId];

      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (curr === sourceArtifactId) {
          return {
            valid: false,
            error: `[CICLO DE PROVENIÊNCIA INVÁLIDO] A relação '${edgeType}' entre ${sourceArtifactId} e ${targetArtifactId} criaria um ciclo causal.`,
          };
        }

        if (!visited.has(curr)) {
          visited.add(curr);
          const targetArt = artifactStore.getById(curr);
          if (targetArt && targetArt.relationships) {
            for (const r of targetArt.relationships) {
              if (["DERIVED_FROM", "GENERATED_FROM", "PRODUCES", "DEPENDS_ON"].includes(r.type)) {
                queue.push(r.targetArtifactId);
              }
            }
          }
        }
      }
    }

    return { valid: true };
  }

  /**
   * Generates graph representation formatted for UI and visual exploration
   */
  public getCreativeGraphData(filterStudio?: string): {
    nodes: CreativeGraphNode[];
    edges: CreativeGraphEdge[];
  } {
    this.rebuildIndex();
    const artifacts = artifactStore.getAll();
    const nodes: CreativeGraphNode[] = [];
    const edges: CreativeGraphEdge[] = [];

    for (const art of artifacts) {
      if (filterStudio && filterStudio !== "ALL" && art.type !== filterStudio) {
        continue;
      }

      const deps = art.relationships || [];
      const dependents = this.reverseIndex.get(art.id) || [];

      nodes.push({
        id: art.id,
        artifactId: art.id,
        name: art.name,
        type: art.type,
        status: art.status,
        currentVersionNumber: art.currentVersionNumber || 1,
        currentVersionId: art.currentVersionId,
        projectId: art.projectId,
        health: art.status === "TRASHED" ? "SOURCE_TRASHED" : "VALID",
        dependencyCount: deps.length,
        dependentCount: dependents.length,
      });

      for (let i = 0; i < deps.length; i++) {
        const r = deps[i];
        edges.push({
          id: `edge-${art.id}-${r.targetArtifactId}-${i}`,
          sourceArtifactId: art.id,
          targetArtifactId: r.targetArtifactId,
          type: r.type,
          semanticRole: r.semanticRole,
          pinMode: r.pinMode || "PINNED",
          targetVersionId: r.targetVersionId,
          targetVersionNumber: r.targetVersionNumber,
          health: "VALID",
        });
      }
    }

    return { nodes, edges };
  }
}

export const creativeGraph = new CreativeGraphEngine();

