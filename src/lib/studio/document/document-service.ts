import {
  DocumentClassification,
  EditorialStatus,
  DocumentMetadata,
  DocumentContent,
  DocumentSuggestion,
  DocumentHeading,
  DocumentExportOptions,
  DocumentItem,
} from "./types";
import { DOCUMENT_TEMPLATES } from "./document-templates";
import { artifactService } from "../../artifacts/artifact-service";
import { versionManager } from "../../artifacts/version-manager";
import { assetManager } from "../../artifacts/asset-manager";
import { permissionPolicyEngine } from "../../permissions/permission-policy";
import { athenaEventBus } from "../../athena/events/event-bus";
import { notificationStore } from "../../notifications/notification-store";
import { ArtifactActor, ArtifactStatus } from "../../artifacts/types";
import { artifactStore } from "../../artifacts/artifact-store";

const DOC_CONTENT_STORAGE_PREFIX = "varynth_doc_content_";

export class DocumentService {
  private contentCache: Map<string, string> = new Map();
  private suggestions: Map<string, DocumentSuggestion[]> = new Map();

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(DOC_CONTENT_STORAGE_PREFIX)) {
            const artifactId = key.replace(DOC_CONTENT_STORAGE_PREFIX, "");
            const val = localStorage.getItem(key);
            if (val) {
              this.contentCache.set(artifactId, val);
            }
          }
        }
      } catch (err) {
        console.warn("[DocumentService] Falha ao ler cache do localStorage:", err);
      }
    }
  }

  public extractOutline(markdown: string): DocumentHeading[] {
    const lines = markdown.split("\n");
    const headings: DocumentHeading[] = [];

    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const slug = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-");
        headings.push({
          id: `heading-${index}-${slug}`,
          level,
          text,
          slug,
        });
      }
    });

    return headings;
  }

  public countWords(text: string): number {
    if (!text || text.trim().length === 0) return 0;
    return text.trim().split(/\s+/).length;
  }

  public async createDocument(params: {
    title: string;
    subtitle?: string;
    documentType?: DocumentClassification;
    templateId?: string;
    projectId?: string;
    createdBy?: ArtifactActor;
    initialContent?: string;
  }): Promise<{ success: boolean; document?: DocumentItem; error?: string }> {
    const docType = params.documentType || "ARTICLE";
    const template = DOCUMENT_TEMPLATES.find((t) => t.id === params.templateId) || DOCUMENT_TEMPLATES[0];
    const initialText = params.initialContent || template.initialContent.replace(/# Novo Documento|# Título do Artigo Acadêmico/, `# ${params.title}`);
    const actor = params.createdBy || "USER";

    const outline = this.extractOutline(initialText);
    const wordCount = this.countWords(initialText);

    const metadata: DocumentMetadata = {
      documentType: docType,
      editorialStatus: "WRITING",
      subtitle: params.subtitle,
      language: "pt-BR",
      wordCount,
      templateId: params.templateId,
      outline,
      references: [],
      customSections: [],
    };

    // 1. Create Universal Artifact (Status DRAFT)
    const createArtRes = await artifactService.createArtifact(
      {
        type: "DOCUMENT",
        name: params.title,
        description: params.subtitle || `${docType} criado no Document Studio`,
        projectId: params.projectId,
        tags: [docType.toLowerCase(), "document-studio"],
        metadata: { ...metadata },
      },
      actor
    );

    if (!createArtRes.success || !createArtRes.artifact) {
      return { success: false, error: createArtRes.error || "Falha ao instanciar Artifact DOCUMENT" };
    }

    const artifact = createArtRes.artifact;

    // 2. Persist Document Content
    await this.saveContentLocally(artifact.id, initialText);

    athenaEventBus.emit("ARTIFACT_CREATED", { artifactId: artifact.id, type: "DOCUMENT", title: artifact.name });

    return {
      success: true,
      document: {
        artifact,
        metadata,
        content: initialText,
      },
    };
  }

  public getDocument(artifactId: string): DocumentItem | null {
    const artifact = artifactService.getById(artifactId);
    if (!artifact || artifact.type !== "DOCUMENT") return null;

    let content = this.contentCache.get(artifactId);
    if (!content && typeof window !== "undefined" && window.localStorage) {
      content = localStorage.getItem(`${DOC_CONTENT_STORAGE_PREFIX}${artifactId}`) || "";
    }
    if (!content) {
      content = `# ${artifact.name}\n\n`;
    }

    const metadata = (artifact.metadata as DocumentMetadata) || {
      documentType: "GENERIC",
      editorialStatus: "WRITING",
      wordCount: this.countWords(content),
      outline: this.extractOutline(content),
    };

    return {
      artifact,
      metadata,
      content,
    };
  }

  public async saveDocumentContent(
    artifactId: string,
    content: string,
    metadataUpdate?: Partial<DocumentMetadata>,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; document?: DocumentItem; error?: string }> {
    const existing = this.getDocument(artifactId);
    if (!existing) {
      return { success: false, error: "Documento não encontrado." };
    }

    // Permission check for Athena direct modifications on published documents
    if (actor === "ATHENA" && existing.artifact.status === "PUBLISHED") {
      const perm = permissionPolicyEngine.evaluate({
        actor: { type: "ATHENA" },
        action: "MODIFY",
        targetDomain: "ARTIFACT_PUBLISHED",
        resourceId: artifactId,
        resourceStatus: "PUBLISHED",
      });

      if (perm.requiresConfirmation) {
        return {
          success: false,
          error: "Modificação de documento publicado pela Athena exige confirmação explícita do usuário (CONFIRM).",
        };
      }
    }

    // 1. Persist Content
    await this.saveContentLocally(artifactId, content);

    // 2. Update Artifact Metadata
    const outline = this.extractOutline(content);
    const wordCount = this.countWords(content);
    const updatedMeta: DocumentMetadata = {
      ...existing.metadata,
      ...metadataUpdate,
      outline,
      wordCount,
    };

    const updateArtRes = await artifactService.updateArtifact(
      artifactId,
      { metadata: { ...updatedMeta } },
      actor,
      `Conteúdo do documento atualizado (${wordCount} palavras)`,
      actor !== "ATHENA" // skip snapshot only for regular user autosaves, Athena modifications always snapshot
    );

    if (!updateArtRes.success) {
      return { success: false, error: updateArtRes.error };
    }

    athenaEventBus.emit("ARTIFACT_UPDATED", { artifactId, wordCount });

    return {
      success: true,
      document: {
        artifact: updateArtRes.artifact!,
        metadata: updatedMeta,
        content,
      },
    };
  }

  public async createManualVersion(
    artifactId: string,
    label: string,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; versionNumber?: string; error?: string }> {
    const doc = this.getDocument(artifactId);
    if (!doc) return { success: false, error: "Documento não encontrado." };

    const newVersion = versionManager.createSnapshot(doc.artifact, label, actor);
    if (!newVersion) {
      return { success: false, error: "Falha ao registrar versão." };
    }

    artifactStore.save(doc.artifact);

    notificationStore.add({
      type: "DOCUMENT_VERSION_CREATED",
      title: `Nova Versão: v${newVersion.versionNumber}.0`,
      message: `Versão v${newVersion.versionNumber}.0 ("${label}") registrada no histórico com sucesso.`,
      severity: "INFO",
      source: "ATHENA",
      targetPath: "/modules/studio",
    });

    return { success: true, versionNumber: `v${newVersion.versionNumber}.0` };
  }

  public async restoreVersion(
    artifactId: string,
    targetVersionNumber: number | string,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; document?: DocumentItem; error?: string }> {
    const doc = this.getDocument(artifactId);
    if (!doc) return { success: false, error: "Documento não encontrado." };

    const num = typeof targetVersionNumber === "string"
      ? parseInt(targetVersionNumber.replace(/^v/, ""), 10)
      : targetVersionNumber;

    // Alex Principle rollback: creates new version vNext preserving full history
    const rollbackRes = versionManager.rollbackToVersion(doc.artifact, num, actor);
    if (!rollbackRes.success || !rollbackRes.rolledBackArtifact) {
      return { success: false, error: rollbackRes.error || "Falha no rollback de versão." };
    }

    artifactStore.save(rollbackRes.rolledBackArtifact);

    return {
      success: true,
      document: this.getDocument(artifactId) || undefined,
    };
  }

  public suggestChange(
    artifactId: string,
    originalText: string,
    proposedText: string,
    rationale?: string,
    actor: ArtifactActor = "ATHENA"
  ): DocumentSuggestion {
    const list = this.suggestions.get(artifactId) || [];
    const suggestion: DocumentSuggestion = {
      id: `sug-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      artifactId,
      originalText,
      proposedText,
      rationale,
      status: "PENDING",
      createdBy: actor,
      createdAt: new Date().toISOString(),
    };

    list.push(suggestion);
    this.suggestions.set(artifactId, list);
    return suggestion;
  }

  public async acceptSuggestion(
    artifactId: string,
    suggestionId: string
  ): Promise<{ success: boolean; error?: string }> {
    const list = this.suggestions.get(artifactId) || [];
    const sug = list.find((s) => s.id === suggestionId);
    if (!sug || sug.status !== "PENDING") {
      return { success: false, error: "Sugestão não encontrada ou já resolvida." };
    }

    const doc = this.getDocument(artifactId);
    if (!doc) return { success: false, error: "Documento não encontrado." };

    if (!doc.content.includes(sug.originalText)) {
      return { success: false, error: "O texto original da sugestão não foi localizado no documento." };
    }

    const newContent = doc.content.replace(sug.originalText, sug.proposedText);
    await this.saveDocumentContent(artifactId, newContent, {}, "ATHENA");

    sug.status = "ACCEPTED";
    sug.resolvedAt = new Date().toISOString();

    return { success: true };
  }

  public rejectSuggestion(
    artifactId: string,
    suggestionId: string
  ): { success: boolean; error?: string } {
    const list = this.suggestions.get(artifactId) || [];
    const sug = list.find((s) => s.id === suggestionId);
    if (!sug || sug.status !== "PENDING") {
      return { success: false, error: "Sugestão não encontrada ou já resolvida." };
    }

    sug.status = "REJECTED";
    sug.resolvedAt = new Date().toISOString();
    return { success: true };
  }

  public getSuggestions(artifactId: string): DocumentSuggestion[] {
    return [...(this.suggestions.get(artifactId) || [])];
  }

  public exportDocument(
    artifactId: string,
    options: DocumentExportOptions = { format: "MARKDOWN", profile: "STANDARD" }
  ): { content: string; mimeType: string; fileName: string } {
    const doc = this.getDocument(artifactId);
    if (!doc) throw new Error("Documento não encontrado para exportação.");

    const safeTitle = doc.artifact.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();

    if (options.format === "MARKDOWN") {
      let md = doc.content;
      if (options.profile === "PUBLIC_SAFE") {
        // Strip private paths
        md = md.replace(/C:\\[^\s]+/g, "[caminho_local_protegido]");
      }
      return {
        content: md,
        mimeType: "text/markdown",
        fileName: `${safeTitle}.md`,
      };
    }

    if (options.format === "HTML" || options.format === "PDF") {
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${doc.artifact.name}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    h1, h2, h3 { color: #0f172a; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    blockquote { border-left: 4px solid #3b82f6; margin: 0; padding-left: 16px; color: #64748b; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
    pre code { display: block; padding: 12px; overflow-x: auto; }
    @media print { body { margin: 0; max-width: 100%; } }
  </style>
</head>
<body>
  ${this.simpleMarkdownToHtml(doc.content)}
</body>
</html>`;
      return {
        content: html,
        mimeType: options.format === "HTML" ? "text/html" : "application/pdf",
        fileName: options.format === "HTML" ? `${safeTitle}.html` : `${safeTitle}.pdf`,
      };
    }

    throw new Error(`Formato de exportação '${options.format}' não suportado.`);
  }

  public async importMarkdown(
    fileName: string,
    fileContent: string,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; document?: DocumentItem; error?: string }> {
    const cleanTitle = fileName.replace(/\.md$|\.txt$/i, "");
    return this.createDocument({
      title: cleanTitle,
      initialContent: fileContent,
      createdBy: actor,
      documentType: "GENERIC",
    });
  }

  public listDocuments(): DocumentItem[] {
    const artifacts = artifactService.listAll("DOCUMENT");
    return artifacts.map((art) => {
      let content = this.contentCache.get(art.id) || "";
      if (!content && typeof window !== "undefined" && window.localStorage) {
        content = localStorage.getItem(`${DOC_CONTENT_STORAGE_PREFIX}${art.id}`) || "";
      }
      return {
        artifact: art,
        metadata: (art.metadata as DocumentMetadata) || {
          documentType: "GENERIC",
          editorialStatus: "WRITING",
        },
        content,
      };
    });
  }

  private simpleMarkdownToHtml(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>")
      .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*)\*/gim, "<em>$1</em>")
      .replace(/\n$/gim, "<br />")
      .split("\n\n")
      .map((p) => `<p>${p.trim()}</p>`)
      .join("\n");
  }

  private async saveContentLocally(artifactId: string, content: string): Promise<void> {
    this.contentCache.set(artifactId, content);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(`${DOC_CONTENT_STORAGE_PREFIX}${artifactId}`, content);
      } catch (err) {
        console.error("[DocumentService] Falha ao persistir conteúdo no storage:", err);
      }
    }
  }
}

export const documentService = new DocumentService();
