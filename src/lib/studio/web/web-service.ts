import {
  WebsiteItem,
  WebFileItem,
  WebsiteMetadata,
  WebMultiFileChangeSet,
  WebFileDiff,
  WebExportPackage,
  WebFileLanguage,
} from "./types";
import { WEB_TEMPLATES } from "./web-templates";
import { artifactService } from "../../artifacts/artifact-service";
import { versionManager } from "../../artifacts/version-manager";
import { artifactStore } from "../../artifacts/artifact-store";
import { permissionPolicyEngine } from "../../permissions/permission-policy";
import { athenaEventBus } from "../../athena/events/event-bus";
import { notificationStore } from "../../notifications/notification-store";
import { ArtifactActor, ArtifactStatus } from "../../artifacts/types";
import { webBuildEngine } from "./web-build-engine";

const WEB_FILES_STORAGE_PREFIX = "varynth_web_files_";

export class WebService {
  private filesCache: Map<string, WebFileItem[]> = new Map();
  private pendingChangeSets: Map<string, WebMultiFileChangeSet[]> = new Map();

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(WEB_FILES_STORAGE_PREFIX)) {
            const websiteId = key.replace(WEB_FILES_STORAGE_PREFIX, "");
            const raw = localStorage.getItem(key);
            if (raw) {
              this.filesCache.set(websiteId, JSON.parse(raw));
            }
          }
        }
      } catch (err) {
        console.warn("[WebService] Falha ao reidratar cache de arquivos web:", err);
      }
    }
  }

  /**
   * Creates a new Website Artifact and sets up its initial virtual file system.
   */
  public async createWebsite(params: {
    name: string;
    description?: string;
    projectId?: string;
    templateId?: string;
    actor?: ArtifactActor;
  }): Promise<{ success: boolean; website?: WebsiteItem; error?: string }> {
    const actor = params.actor || "USER";
    const template = WEB_TEMPLATES.find((t) => t.id === (params.templateId || "blank")) || WEB_TEMPLATES[0];

    const metadata: WebsiteMetadata = {
      framework: template.framework,
      entryFile: "index.html",
      outputDirectory: "dist",
      previewMode: "STATIC_HTML",
      responsive: true,
      lastBuildStatus: "IDLE",
    };

    // 1. Create WEBSITE Artifact
    const artRes = await artifactService.createArtifact(
      {
        type: "WEBSITE",
        name: params.name,
        description: params.description || template.description,
        projectId: params.projectId,
        metadata: { ...metadata },
        tags: ["web", template.framework.toLowerCase()],
      },
      actor
    );

    if (!artRes.success || !artRes.artifact) {
      return { success: false, error: artRes.error || "Falha ao instanciar WEBSITE Artifact." };
    }

    const websiteId = artRes.artifact.id;
    const now = new Date().toISOString();

    // 2. Instantiate files from template
    const files: WebFileItem[] = template.files.map((tf, index) => ({
      id: `file-${websiteId}-${index}-${Date.now()}`,
      path: tf.path,
      name: tf.name,
      content: tf.content,
      language: tf.language,
      isEntry: tf.isEntry,
      createdAt: now,
      updatedAt: now,
    }));

    await this.saveFilesLocally(websiteId, files);

    athenaEventBus.emit("WEBSITE_CREATED", {
      websiteId,
      name: params.name,
      templateId: template.id,
      actor,
    });

    notificationStore.add({
      type: "WEBSITE_CREATED",
      title: `Novo Website: ${params.name}`,
      message: `Website criado com sucesso a partir do modelo "${template.name}".`,
      severity: "INFO",
      source: "SYSTEM",
      targetPath: "/modules/studio",
    });

    return {
      success: true,
      website: {
        artifact: artRes.artifact,
        metadata,
        files,
      },
    };
  }

  public getWebsite(websiteId: string): WebsiteItem | null {
    const artifact = artifactService.getById(websiteId);
    if (!artifact || artifact.type !== "WEBSITE") return null;

    let files = this.filesCache.get(websiteId);
    if (!files && typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(`${WEB_FILES_STORAGE_PREFIX}${websiteId}`);
      if (raw) {
        files = JSON.parse(raw);
        this.filesCache.set(websiteId, files!);
      }
    }

    if (!files) files = [];

    return {
      artifact,
      metadata: (artifact.metadata as unknown as WebsiteMetadata) || {
        framework: "STATIC",
        entryFile: "index.html",
        outputDirectory: "dist",
        previewMode: "STATIC_HTML",
      },
      files,
    };
  }

  public listWebsites(): WebsiteItem[] {
    const artifacts = artifactService.listAll("WEBSITE");
    return artifacts.map((art) => {
      let files = this.filesCache.get(art.id) || [];
      if (files.length === 0 && typeof window !== "undefined" && window.localStorage) {
        const raw = localStorage.getItem(`${WEB_FILES_STORAGE_PREFIX}${art.id}`);
        if (raw) files = JSON.parse(raw);
      }
      return {
        artifact: art,
        metadata: (art.metadata as unknown as WebsiteMetadata) || {
          framework: "STATIC",
          entryFile: "index.html",
          outputDirectory: "dist",
          previewMode: "STATIC_HTML",
        },
        files,
      };
    });
  }

  /**
   * Saves source files without polluting the version history per keystroke.
   */
  public async saveFiles(
    websiteId: string,
    files: WebFileItem[],
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const website = this.getWebsite(websiteId);
    if (!website) return { success: false, error: "Website não encontrado." };

    // Permission check on published websites
    if (actor === "ATHENA" && website.artifact.status === "PUBLISHED") {
      const perm = permissionPolicyEngine.evaluate({
        actor: { type: "ATHENA" },
        action: "MODIFY",
        targetDomain: "ARTIFACT_PUBLISHED",
        resourceId: websiteId,
        resourceStatus: "PUBLISHED",
      });

      if (perm.requiresConfirmation) {
        return {
          success: false,
          error: "Modificação de website publicado pela Athena exige confirmação explícita do usuário (CONFIRM).",
        };
      }
    }

    await this.saveFilesLocally(websiteId, files);

    // Update artifact metadata
    await artifactService.updateArtifact(
      websiteId,
      {
        metadata: {
          ...website.metadata,
          fileCount: files.length,
          lastSavedAt: new Date().toISOString(),
        },
      },
      actor,
      `Atualização de arquivos fonte (${files.length} arquivos)`,
      actor !== "ATHENA" // skip version snapshot for regular user autosaves
    );

    return { success: true };
  }

  public async createFile(
    websiteId: string,
    path: string,
    initialContent = "",
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; file?: WebFileItem; error?: string }> {
    const website = this.getWebsite(websiteId);
    if (!website) return { success: false, error: "Website não encontrado." };

    const normalizedPath = path.trim().replace(/^\/+/, "");
    if (website.files.some((f) => f.path === normalizedPath)) {
      return { success: false, error: `Arquivo '${normalizedPath}' já existe no projeto.` };
    }

    const ext = normalizedPath.split(".").pop()?.toLowerCase() || "";
    let language: WebFileLanguage = "text";
    if (ext === "html") language = "html";
    else if (ext === "css") language = "css";
    else if (ext === "js") language = "javascript";
    else if (ext === "ts" || ext === "tsx") language = "typescript";
    else if (ext === "json") language = "json";
    else if (ext === "md") language = "markdown";
    else if (ext === "svg") language = "svg";

    const newFile: WebFileItem = {
      id: `file-${websiteId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      path: normalizedPath,
      name: normalizedPath.split("/").pop() || normalizedPath,
      content: initialContent,
      language,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedFiles = [...website.files, newFile];
    await this.saveFiles(websiteId, updatedFiles, actor);

    return { success: true, file: newFile };
  }

  public async deleteFile(
    websiteId: string,
    filePath: string,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const website = this.getWebsite(websiteId);
    if (!website) return { success: false, error: "Website não encontrado." };

    const updatedFiles = website.files.filter((f) => f.path !== filePath);
    await this.saveFiles(websiteId, updatedFiles, actor);

    return { success: true };
  }

  public async renameFile(
    websiteId: string,
    oldPath: string,
    newPath: string,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const website = this.getWebsite(websiteId);
    if (!website) return { success: false, error: "Website não encontrado." };

    const targetFile = website.files.find((f) => f.path === oldPath);
    if (!targetFile) return { success: false, error: "Arquivo alvo não encontrado." };

    targetFile.path = newPath;
    targetFile.name = newPath.split("/").pop() || newPath;
    targetFile.updatedAt = new Date().toISOString();

    await this.saveFiles(websiteId, website.files, actor);
    return { success: true };
  }

  /**
   * Creates a manual version snapshot in the immutable version history.
   */
  public async createManualVersion(
    websiteId: string,
    label: string,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; versionNumber?: string; error?: string }> {
    const website = this.getWebsite(websiteId);
    if (!website) return { success: false, error: "Website não encontrado." };

    const newVersion = versionManager.createSnapshot(website.artifact, label, actor);
    if (!newVersion) return { success: false, error: "Falha ao registrar versão." };

    artifactStore.save(website.artifact);

    notificationStore.add({
      type: "WEBSITE_VERSION_CREATED",
      title: `Nova Versão: v${newVersion.versionNumber}.0`,
      message: `Versão v${newVersion.versionNumber}.0 ("${label}") registrada no histórico.`,
      severity: "INFO",
      source: "SYSTEM",
      targetPath: "/modules/studio",
    });

    return { success: true, versionNumber: `v${newVersion.versionNumber}.0` };
  }

  /**
   * Restores a past version using the Alex Principle (creating a non-destructive vNext).
   */
  public async restoreVersion(
    websiteId: string,
    targetVersionNumber: number | string,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; website?: WebsiteItem; error?: string }> {
    const website = this.getWebsite(websiteId);
    if (!website) return { success: false, error: "Website não encontrado." };

    const num = typeof targetVersionNumber === "string"
      ? parseInt(targetVersionNumber.replace(/^v/, ""), 10)
      : targetVersionNumber;

    const rollbackRes = versionManager.rollbackToVersion(website.artifact, num, actor);
    if (!rollbackRes.success || !rollbackRes.rolledBackArtifact) {
      return { success: false, error: rollbackRes.error || "Falha no rollback de versão." };
    }

    artifactStore.save(rollbackRes.rolledBackArtifact);

    return {
      success: true,
      website: this.getWebsite(websiteId) || undefined,
    };
  }

  /**
   * Athena Multi-File ChangeSet Management
   */
  public proposeChangeSet(
    websiteId: string,
    title: string,
    description: string,
    changes: WebFileDiff[],
    proposedBy: ArtifactActor = "ATHENA"
  ): WebMultiFileChangeSet {
    const changeSet: WebMultiFileChangeSet = {
      id: `cs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      websiteId,
      title,
      description,
      proposedBy,
      createdAt: new Date().toISOString(),
      status: "PENDING",
      changes,
    };

    const current = this.pendingChangeSets.get(websiteId) || [];
    current.push(changeSet);
    this.pendingChangeSets.set(websiteId, current);

    athenaEventBus.emit("ATHENA_CHANGESET_PROPOSED", { websiteId, changeSetId: changeSet.id, title });
    return changeSet;
  }

  public getPendingChangeSets(websiteId: string): WebMultiFileChangeSet[] {
    return (this.pendingChangeSets.get(websiteId) || []).filter((cs) => cs.status === "PENDING");
  }

  public async acceptChangeSet(
    websiteId: string,
    changeSetId: string
  ): Promise<{ success: boolean; error?: string }> {
    const website = this.getWebsite(websiteId);
    if (!website) return { success: false, error: "Website não encontrado." };

    const sets = this.pendingChangeSets.get(websiteId) || [];
    const target = sets.find((cs) => cs.id === changeSetId);
    if (!target) return { success: false, error: "ChangeSet não encontrado." };

    // 1. Safety snapshot before applying AI changes
    versionManager.createSnapshot(
      website.artifact,
      `Snapshot de segurança antes de aplicar ChangeSet "${target.title}"`,
      "ATHENA"
    );

    // 2. Apply file modifications
    const updatedFiles = [...website.files];
    for (const change of target.changes) {
      const fileIndex = updatedFiles.findIndex((f) => f.path === change.path);
      if (change.type === "DELETED") {
        if (fileIndex >= 0) updatedFiles.splice(fileIndex, 1);
      } else if (change.type === "ADDED") {
        if (fileIndex >= 0) {
          updatedFiles[fileIndex].content = change.newContent;
        } else {
          updatedFiles.push({
            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            path: change.path,
            name: change.path.split("/").pop() || change.path,
            content: change.newContent,
            language: "javascript",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else if (change.type === "MODIFIED") {
        if (fileIndex >= 0) {
          updatedFiles[fileIndex].content = change.newContent;
          updatedFiles[fileIndex].updatedAt = new Date().toISOString();
        }
      }
    }

    target.status = "ACCEPTED";
    await this.saveFiles(websiteId, updatedFiles, "ATHENA");

    return { success: true };
  }

  public rejectChangeSet(websiteId: string, changeSetId: string): { success: boolean } {
    const sets = this.pendingChangeSets.get(websiteId) || [];
    const target = sets.find((cs) => cs.id === changeSetId);
    if (target) {
      target.status = "REJECTED";
      athenaEventBus.emit("ATHENA_CHANGESET_REJECTED", { websiteId, changeSetId });
    }
    return { success: true };
  }

  /**
   * Exports the website project into a structured format with PUBLIC-SAFE sanitization.
   */
  public exportPackage(
    websiteId: string,
    packageType: "SOURCE_ZIP" | "DIST_BUNDLE" | "STANDALONE_HTML"
  ): WebExportPackage | null {
    const website = this.getWebsite(websiteId);
    if (!website) return null;

    // PUBLIC-SAFE Sanitization: remove any potential secrets
    const sanitizedFiles = website.files.map((f) => ({
      path: f.path,
      content: f.content.replace(/(API_KEY|TOKEN|SECRET|PASSWORD)\s*=\s*['"][^'"]+['"]/gi, "$1=[REDACTED]"),
    }));

    return {
      websiteId,
      websiteName: website.artifact.name,
      version: website.artifact.currentVersionNumber,
      exportedAt: new Date().toISOString(),
      packageType,
      files: sanitizedFiles,
      manifest: {
        name: website.artifact.name,
        framework: website.metadata.framework,
        entryFile: website.metadata.entryFile,
        exportedBy: "VARYNTH Web Studio",
        sanitized: true,
      },
    };
  }

  /**
   * Imports an external web project into a new WEBSITE Artifact.
   */
  public async importProject(
    projectName: string,
    files: { path: string; content: string }[],
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; website?: WebsiteItem; error?: string }> {
    const created = await this.createWebsite({
      name: projectName,
      actor,
    });

    if (!created.success || !created.website) {
      return { success: false, error: created.error };
    }

    const websiteId = created.website.artifact.id;
    const now = new Date().toISOString();

    const webFiles: WebFileItem[] = files.map((f, i) => {
      const ext = f.path.split(".").pop()?.toLowerCase() || "";
      let language: WebFileLanguage = "text";
      if (ext === "html") language = "html";
      else if (ext === "css") language = "css";
      else if (ext === "js") language = "javascript";
      else if (ext === "json") language = "json";

      return {
        id: `file-${websiteId}-${i}-${Date.now()}`,
        path: f.path,
        name: f.path.split("/").pop() || f.path,
        content: f.content,
        language,
        isEntry: f.path === "index.html",
        createdAt: now,
        updatedAt: now,
      };
    });

    await this.saveFiles(websiteId, webFiles, actor);

    return {
      success: true,
      website: this.getWebsite(websiteId) || undefined,
    };
  }

  private async saveFilesLocally(websiteId: string, files: WebFileItem[]): Promise<void> {
    this.filesCache.set(websiteId, files);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(`${WEB_FILES_STORAGE_PREFIX}${websiteId}`, JSON.stringify(files));
      } catch (err) {
        console.warn("[WebService] Erro ao persistir arquivos no localStorage:", err);
      }
    }
  }
}

export const webService = new WebService();

