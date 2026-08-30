import { Artifact, ArtifactType, ArtifactStatus, ArtifactActor } from "./types";

const STORAGE_KEY = "varynth_artifacts_v4";
const ARTIFACT_EVENT = "varynth_artifacts_updated";

export class ArtifactStore {
  private artifacts: Artifact[] = [];
  private isLoaded: boolean = false;

  constructor() {
    this.init();
    this.setupStorageListener();
  }

  private setupStorageListener(): void {
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("storage", (event) => {
        if (event.key === STORAGE_KEY) {
          this.reloadFromStorage();
          this.emitUpdate();
        }
      });
    }
  }

  private emitUpdate(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ARTIFACT_EVENT));
    }
  }

  private init(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.artifacts = this.migrateLegacyRevisions(parsed);
          } else {
            this.artifacts = this.getSeedArtifacts();
            this.saveToStorage();
          }
        } else {
          this.artifacts = this.getSeedArtifacts();
          this.saveToStorage();
        }
        this.isLoaded = true;
        return;
      } catch (err) {
        console.warn("[ArtifactStore] Erro ao carregar do localStorage, usando fallback:", err);
      }
    }

    this.artifacts = this.getSeedArtifacts();
    this.isLoaded = true;
  }

  private migrateLegacyRevisions(list: Artifact[]): Artifact[] {
    let mutated = false;
    const migrated = list.map((art) => {
      if (typeof art.revision !== "number" || art.revision < 1) {
        mutated = true;
        return { ...art, revision: 1 };
      }
      return art;
    });
    if (mutated) {
      this.artifacts = migrated;
      this.saveToStorage();
    }
    return migrated;
  }

  private saveToStorage(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.artifacts));
      } catch (err) {
        console.error("[ArtifactStore] Erro ao persistir artefatos:", err);
      }
    }
  }

  public reloadFromStorage(): void {
    this.init();
  }

  public getAll(): Artifact[] {
    return JSON.parse(JSON.stringify(this.artifacts));
  }

  public getById(id: string): Artifact | undefined {
    const item = this.artifacts.find((a) => a.id === id);
    if (!item) return undefined;
    if (typeof item.revision !== "number") {
      item.revision = 1;
    }
    return JSON.parse(JSON.stringify(item));
  }

  public getByProjectId(projectId: string): Artifact[] {
    return JSON.parse(JSON.stringify(this.artifacts.filter((a) => a.projectId === projectId)));
  }

  public save(artifact: Artifact, expectedRevision?: number): Artifact {
    const clone = JSON.parse(JSON.stringify(artifact)) as Artifact;
    const idx = this.artifacts.findIndex((a) => a.id === clone.id);

    if (idx >= 0) {
      const existing = this.artifacts[idx];
      const currentRev = typeof existing.revision === "number" ? existing.revision : 1;

      // Optimistic Concurrency Control (OCC) check
      if (expectedRevision !== undefined && expectedRevision !== currentRev) {
        throw new Error(
          `WRITE_CONFLICT: Conflito de escrita no artefato '${clone.name}' (${clone.id}). Revisão esperada: ${expectedRevision}, revisão atual no store: ${currentRev}.`
        );
      }

      clone.revision = currentRev + 1;
      this.artifacts[idx] = clone;
    } else {
      clone.revision = typeof clone.revision === "number" ? clone.revision : 1;
      this.artifacts.unshift(clone);
    }

    this.saveToStorage();
    this.emitUpdate();
    return JSON.parse(JSON.stringify(clone));
  }

  public remove(id: string): boolean {
    const idx = this.artifacts.findIndex((a) => a.id === id);
    if (idx === -1) return false;

    this.artifacts.splice(idx, 1);
    this.saveToStorage();
    this.emitUpdate();
    return true;
  }

  public resetToSeed(): void {
    this.artifacts = this.getSeedArtifacts();
    this.saveToStorage();
    this.emitUpdate();
  }

  private getSeedArtifacts(): Artifact[] {
    return [
      {
        id: "art-doc-001",
        type: "DOCUMENT",
        name: "Tratado de Responsabilidade Civil Algorítmica",
        description: "Monografia canônica sobre causalidade probabilística em inteligências artificiais autônomas.",
        projectId: "proj-1",
        status: "ACTIVE",
        createdBy: "USER",
        createdAt: "2026-08-15T10:00:00.000Z",
        updatedAt: "2026-08-29T14:30:00.000Z",
        currentVersionId: "ver-art-doc-001-v2",
        currentVersionNumber: 2,
        versions: [
          {
            versionId: "ver-art-doc-001-v1",
            versionNumber: 1,
            label: "v1.0 - Estrutura Metodológica",
            createdAt: "2026-08-15T10:00:00.000Z",
            createdBy: "USER",
            changeSummary: "Definição inicial de teses e premissas hermenêuticas.",
            snapshotData: {
              name: "Tratado de Responsabilidade Civil Algorítmica",
              status: "DRAFT",
            },
            fileAssetIds: ["file-doc-draft.md"],
          },
          {
            versionId: "ver-art-doc-001-v2",
            versionNumber: 2,
            label: "v2.0 - Consolidação Dialética",
            createdAt: "2026-08-29T14:30:00.000Z",
            createdBy: "ATHENA",
            changeSummary: "Incorporação dos acórdãos do STF e testes de regressão epistêmica.",
            snapshotData: {
              name: "Tratado de Responsabilidade Civil Algorítmica",
              status: "ACTIVE",
            },
            fileAssetIds: ["file-doc-final.md", "file-acordaos-stf.pdf"],
          },
        ],
        relationships: [
          {
            targetArtifactId: "art-dataset-001",
            type: "DEPENDS_ON",
            targetVersionId: "ver-art-data-001-v1",
            targetVersionNumber: 1,
            pinMode: "PINNED",
            description: "Consome o dataset jurisprudencial do STF.",
            createdAt: "2026-08-20T12:00:00.000Z",
          },
          {
            targetArtifactId: "art-interactive-001",
            type: "SOURCE_OF",
            targetVersionId: "ver-art-int-001-v1",
            targetVersionNumber: 1,
            pinMode: "PINNED",
            description: "Fornece base conceitual para o portal interativo.",
            createdAt: "2026-08-28T09:00:00.000Z",
          },
        ],
        provenance: {
          creator: "USER",
          creatorDetails: "Paulo Alberto",
          sourceContext: "Projeto de Pesquisa em Direito e IA",
        },
        assetFileIds: ["file-doc-final.md", "file-acordaos-stf.pdf"],
        metadata: {
          wordCount: 14200,
          academicArea: "Direito Digital",
          verifiedByCritias: true,
        },
        tags: ["direito", "ia", "responsabilidade-civil", "epistemologia"],
      },
      {
        id: "art-code-001",
        type: "CODE",
        name: "WASM Rust Vector Engine (Athena Engine Core)",
        description: "Motor vetorial nativo em Rust compilado para WebAssembly para buscas semânticas 100% offline.",
        projectId: "proj-varynth-core",
        status: "ACTIVE",
        createdBy: "ATHENA",
        createdAt: "2026-08-20T16:00:00.000Z",
        updatedAt: "2026-08-29T16:00:00.000Z",
        currentVersionId: "ver-art-code-001-v1",
        currentVersionNumber: 1,
        versions: [
          {
            versionId: "ver-art-code-001-v1",
            versionNumber: 1,
            label: "v1.0 - Protótipo WASM",
            createdAt: "2026-08-20T16:00:00.000Z",
            createdBy: "ATHENA",
            changeSummary: "Implementação inicial do cálculo de similaridade cosseno em Rust.",
            snapshotData: {
              name: "WASM Rust Vector Engine",
              status: "ACTIVE",
            },
            fileAssetIds: ["lib.rs", "engine.wasm"],
          },
        ],
        relationships: [
          {
            targetArtifactId: "art-diagram-001",
            type: "ADAPTED_TO",
            targetVersionId: "ver-art-diag-001-v1",
            targetVersionNumber: 1,
            pinMode: "PINNED",
            description: "Mapeado no diagrama de arquitetura transversal.",
            createdAt: "2026-08-25T11:00:00.000Z",
          },
        ],
        provenance: {
          creator: "ATHENA",
          creatorDetails: "Athena Subsystem Builder",
          engineUsed: "Rust wasm-pack",
          sandboxRunId: "sand-092",
        },
        assetFileIds: ["lib.rs", "engine.wasm", "Cargo.toml"],
        metadata: {
          language: "Rust / WASM",
          benchmarkLatencyMs: 3.2,
          offlineOnly: true,
        },
        tags: ["rust", "wasm", "vector-search", "performance", "local-first"],
      },
      {
        id: "art-interactive-001",
        type: "INTERACTIVE",
        name: "VARYNTH Universe Interactive Explorer",
        description: "Experiência interativa de navegação epistêmica em grafo tridimensional.",
        projectId: "proj-1",
        status: "DRAFT",
        createdBy: "USER",
        createdAt: "2026-08-28T09:00:00.000Z",
        updatedAt: "2026-08-29T12:00:00.000Z",
        currentVersionId: "ver-art-int-001-v1",
        currentVersionNumber: 1,
        versions: [
          {
            versionId: "ver-art-int-001-v1",
            versionNumber: 1,
            label: "v1.0 - Canvas 2D / WebGL",
            createdAt: "2026-08-28T09:00:00.000Z",
            createdBy: "USER",
            changeSummary: "Rascunho de nós e arestas com física de forças.",
            snapshotData: {
              name: "VARYNTH Universe Interactive Explorer",
              status: "DRAFT",
            },
            fileAssetIds: ["graph-canvas.tsx"],
          },
        ],
        relationships: [
          {
            targetArtifactId: "art-doc-001",
            type: "DERIVED_FROM",
            targetVersionId: "ver-art-doc-001-v2",
            targetVersionNumber: 2,
            pinMode: "PINNED",
            description: "Derivado dos conceitos do Tratado de IA.",
            createdAt: "2026-08-28T09:00:00.000Z",
          },
        ],
        provenance: {
          creator: "USER",
          sourceContext: "Módulo Graph Epistêmico",
        },
        assetFileIds: ["graph-canvas.tsx", "force-layout.ts"],
        metadata: {
          framework: "Next.js / Canvas API",
          interactivityScore: 95,
        },
        tags: ["interactive", "graph", "canvas", "visualizer"],
      },
      {
        id: "art-dataset-001",
        type: "DATASET",
        name: "Corpus de Jurisprudência STF sobre IA",
        description: "Dataset estruturado em JSON com 48 acórdãos e súmulas sobre responsabilidade tecnológica.",
        projectId: "proj-1",
        status: "ACTIVE",
        createdBy: "SYSTEM",
        createdAt: "2026-08-18T14:00:00.000Z",
        updatedAt: "2026-08-29T10:00:00.000Z",
        currentVersionId: "ver-art-data-001-v1",
        currentVersionNumber: 1,
        versions: [
          {
            versionId: "ver-art-data-001-v1",
            versionNumber: 1,
            label: "v1.0 - Indexação Primária",
            createdAt: "2026-08-18T14:00:00.000Z",
            createdBy: "SYSTEM",
            changeSummary: "Extração e tokenização inicial.",
            snapshotData: {
              name: "Corpus de Jurisprudência STF sobre IA",
              status: "ACTIVE",
            },
            fileAssetIds: ["stf-corpus.json"],
          },
        ],
        relationships: [],
        provenance: {
          creator: "SYSTEM",
          sourceContext: "Vault Importer",
        },
        assetFileIds: ["stf-corpus.json"],
        metadata: {
          recordsCount: 48,
          format: "JSON Schema V1",
        },
        tags: ["dataset", "stf", "jurisprudencia", "dados"],
      },
      {
        id: "art-diagram-001",
        type: "DIAGRAM",
        name: "Mapa da Arquitetura Transversal do VARYNTH",
        description: "Diagrama mermaid detalhando barramentos, camadas de runtime e soberania de dados.",
        projectId: "proj-varynth-core",
        status: "ACTIVE",
        createdBy: "ATHENA",
        createdAt: "2026-08-25T11:00:00.000Z",
        updatedAt: "2026-08-29T16:00:00.000Z",
        currentVersionId: "ver-art-diag-001-v1",
        currentVersionNumber: 1,
        versions: [
          {
            versionId: "ver-art-diag-001-v1",
            versionNumber: 1,
            label: "v1.0 - Arquitetura V4",
            createdAt: "2026-08-25T11:00:00.000Z",
            createdBy: "ATHENA",
            changeSummary: "Geração inicial do mapa mermaid.",
            snapshotData: {
              name: "Mapa da Arquitetura Transversal",
              status: "ACTIVE",
            },
            fileAssetIds: ["architecture-map.mmd"],
          },
        ],
        relationships: [],
        provenance: {
          creator: "ATHENA",
          sourceContext: "Technical Archive Guardian",
        },
        assetFileIds: ["architecture-map.mmd", "architecture-map.svg"],
        metadata: {
          format: "Mermaid / SVG",
          nodesCount: 24,
        },
        tags: ["diagram", "architecture", "mermaid", "docs"],
      },
    ];
  }
}

export const artifactStore = new ArtifactStore();

