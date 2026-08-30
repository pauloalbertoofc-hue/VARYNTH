import {
  VarynthBackupPayload,
  VarynthBackupManifest,
  BackupValidationResult,
  RestoreMode,
} from "./types";
import { artifactStore } from "../artifacts/artifact-store";
import { assetManager } from "../artifacts/asset-manager";
import { creativeGraph } from "../artifacts/creative-graph";
import { CreativeIntegrityValidator } from "../artifacts/creative-integrity-validator";
import { reviewStore } from "../athena/guardian/review-store";
import { notificationStore } from "../notifications/notification-store";
import { athenaEventBus } from "../athena/events/event-bus";
import { notificationService } from "../notifications/notification-service";

const STORAGE_KEYS = {
  PROJECTS: "varynth_os_projects",
  TASKS: "varynth_os_tasks",
  NOTES: "varynth_os_notes",
  VAULT: "varynth_os_vault",
  CHRONOS: "varynth_os_chronos",
  PEOPLE: "varynth_os_people",
  LABS: "varynth_os_labs",
  THESES: "varynth_os_theses",
  RESEARCHES: "varynth_os_researches",
  EVIDENCES: "varynth_os_evidences",
  OPPORTUNITIES: "varynth_os_opportunities",
  FORGE: "varynth_os_forge",
  TRASH: "varynth_os_trash",
  ACTIVITIES: "varynth_os_activities",
  ARTIFACTS: "varynth_artifacts_v4",
  ASSETS: "varynth_assets_registry_v4",
  ASSET_USAGES: "varynth_asset_usages_v4",
  DOC_REVIEWS: "varynth_docs_review_queue_v4",
  DOC_AUDIT: "varynth_docs_audit_log_v4",
  NOTIFICATIONS: "varynth_notifications_v4",
};

export class BackupService {
  public exportVarynthBackup(exportSource = "Paulo Alberto - VARYNTH OS Sovereign"): VarynthBackupPayload {
    const getLocal = <T>(key: string, fallback: T): T => {
      if (typeof window === "undefined" || !window.localStorage) return fallback;
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch {
        return fallback;
      }
    };

    const projects = getLocal(STORAGE_KEYS.PROJECTS, []);
    const tasks = getLocal(STORAGE_KEYS.TASKS, []);
    const notes = getLocal(STORAGE_KEYS.NOTES, []);
    const vault = getLocal(STORAGE_KEYS.VAULT, []);
    const chronos = getLocal(STORAGE_KEYS.CHRONOS, []);
    const people = getLocal(STORAGE_KEYS.PEOPLE, []);
    const labs = getLocal(STORAGE_KEYS.LABS, []);
    const theses = getLocal(STORAGE_KEYS.THESES, []);
    const researches = getLocal(STORAGE_KEYS.RESEARCHES, []);
    const evidences = getLocal(STORAGE_KEYS.EVIDENCES, []);
    const opportunities = getLocal(STORAGE_KEYS.OPPORTUNITIES, []);
    const forgeFiles = getLocal(STORAGE_KEYS.FORGE, []);
    const trash = getLocal(STORAGE_KEYS.TRASH, []);
    const activities = getLocal(STORAGE_KEYS.ACTIVITIES, []);
    const artifacts = artifactStore.getAll();
    const docReviews = reviewStore.getAllReviews();
    const docAuditLogs = reviewStore.getAuditLog();
    const notifications = notificationStore.getAll();
    const assets = getLocal(STORAGE_KEYS.ASSETS, []);
    const assetUsages = getLocal(STORAGE_KEYS.ASSET_USAGES, []);

    const manifest: VarynthBackupManifest = {
      varynthVersion: "4.0.0",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      exportSource,
      entitiesCount: {
        projects: projects.length,
        artifacts: artifacts.length,
        tasks: tasks.length,
        notes: notes.length,
        vaultItems: vault.length,
        chronosEvents: chronos.length,
        people: people.length,
        labs: labs.length,
        theses: theses.length,
        researches: researches.length,
        evidences: evidences.length,
        opportunities: opportunities.length,
        forgeFiles: forgeFiles.length,
        trash: trash.length,
        activities: activities.length,
        docReviews: docReviews.length,
        docAuditLogs: docAuditLogs.length,
        notifications: notifications.length,
        assets: assets.length,
        assetUsages: assetUsages.length,
      },
    };

    const payload: VarynthBackupPayload = {
      manifest,
      data: {
        projects,
        artifacts,
        tasks,
        notes,
        vault,
        chronos,
        people,
        labs,
        theses,
        researches,
        evidences,
        opportunities,
        forgeFiles,
        trash,
        activities,
        docReviews,
        docAuditLogs,
        notifications,
        assets,
        assetUsages,
      },
    };

    athenaEventBus.emit("BACKUP_CREATED", {
      manifest,
      timestamp: manifest.exportedAt,
    });

    return JSON.parse(JSON.stringify(payload));
  }

  public validateBackup(payload: any): BackupValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!payload || typeof payload !== "object") {
      return { valid: false, errors: ["Arquivo de backup inválido ou vazio."], warnings };
    }

    if (!payload.manifest) {
      errors.push("Manifesto de backup ausente no arquivo.");
    } else {
      if (typeof payload.manifest.schemaVersion !== "number") {
        errors.push("Versão de esquema do manifesto ausente ou inválida.");
      }
      if (!payload.manifest.exportedAt) {
        warnings.push("Data de exportação ausente no manifesto.");
      }
    }

    if (!payload.data || typeof payload.data !== "object") {
      errors.push("Dados da carga útil (data) ausentes no backup.");
    } else {
      const requiredArrays = ["projects", "tasks", "notes"];
      requiredArrays.forEach((key) => {
        if (!Array.isArray(payload.data[key])) {
          errors.push(`Coleção obrigatória '${key}' ausente ou não é um array.`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      manifest: payload.manifest,
    };
  }

  public restoreVarynthBackup(
    payload: VarynthBackupPayload,
    mode: RestoreMode = "MERGE"
  ): { success: boolean; error?: string; restoredCount?: Record<string, number> } {
    const validation = this.validateBackup(payload);
    if (!validation.valid) {
      return { success: false, error: `Falha na validação do backup: ${validation.errors.join("; ")}` };
    }

    if (typeof window === "undefined" || !window.localStorage) {
      return { success: true, restoredCount: payload.manifest?.entitiesCount as any };
    }

    try {
      const mergeCollection = (key: string, incomingList: any[] = [], idField = "id") => {
        if (mode === "REPLACE") {
          localStorage.setItem(key, JSON.stringify(incomingList));
          return incomingList.length;
        }

        // MERGE MODE
        const current: any[] = JSON.parse(localStorage.getItem(key) || "[]");
        const mergedMap = new Map();
        current.forEach((item) => mergedMap.set(item[idField], item));
        incomingList.forEach((item) => mergedMap.set(item[idField], item));

        const merged = Array.from(mergedMap.values());
        localStorage.setItem(key, JSON.stringify(merged));
        return merged.length;
      };

      const counts: Record<string, number> = {};

      // ==========================================
      // PHASE A: Restore Entities, Artifacts, Versions & Assets
      // ==========================================
      counts.projects = mergeCollection(STORAGE_KEYS.PROJECTS, payload.data.projects);
      counts.tasks = mergeCollection(STORAGE_KEYS.TASKS, payload.data.tasks);
      counts.notes = mergeCollection(STORAGE_KEYS.NOTES, payload.data.notes);
      counts.vault = mergeCollection(STORAGE_KEYS.VAULT, payload.data.vault);
      counts.chronos = mergeCollection(STORAGE_KEYS.CHRONOS, payload.data.chronos);
      counts.people = mergeCollection(STORAGE_KEYS.PEOPLE, payload.data.people);
      counts.labs = mergeCollection(STORAGE_KEYS.LABS, payload.data.labs);
      counts.theses = mergeCollection(STORAGE_KEYS.THESES, payload.data.theses);
      counts.researches = mergeCollection(STORAGE_KEYS.RESEARCHES, payload.data.researches);
      counts.evidences = mergeCollection(STORAGE_KEYS.EVIDENCES, payload.data.evidences);
      counts.opportunities = mergeCollection(STORAGE_KEYS.OPPORTUNITIES, payload.data.opportunities);
      counts.forgeFiles = mergeCollection(STORAGE_KEYS.FORGE, payload.data.forgeFiles);
      counts.trash = mergeCollection(STORAGE_KEYS.TRASH, payload.data.trash);
      counts.activities = mergeCollection(STORAGE_KEYS.ACTIVITIES, payload.data.activities);

      if (payload.data.artifacts) {
        counts.artifacts = mergeCollection(STORAGE_KEYS.ARTIFACTS, payload.data.artifacts);
        artifactStore.reloadFromStorage();
      }

      if (payload.data.assets) {
        counts.assets = mergeCollection(STORAGE_KEYS.ASSETS, payload.data.assets);
      }

      if (payload.data.docReviews) {
        counts.docReviews = mergeCollection(STORAGE_KEYS.DOC_REVIEWS, payload.data.docReviews);
        reviewStore.reloadFromStorage();
      }

      if (payload.data.notifications) {
        counts.notifications = mergeCollection(STORAGE_KEYS.NOTIFICATIONS, payload.data.notifications);
        notificationStore.reloadFromStorage();
      }

      // ==========================================
      // PHASE B: Restore Relationships & Asset Usages
      // ==========================================
      if (payload.data.assetUsages) {
        counts.assetUsages = mergeCollection(STORAGE_KEYS.ASSET_USAGES, payload.data.assetUsages);
      }

      // ==========================================
      // PHASE C: Creative Graph Rebuild & Integrity Evaluation
      // ==========================================
      creativeGraph.rebuildIndex();
      CreativeIntegrityValidator.evaluateAll();

      // Trigger universal reactive store reload events
      window.dispatchEvent(new CustomEvent("varynth_store_update"));
      window.dispatchEvent(new CustomEvent("varynth_artifacts_updated"));
      window.dispatchEvent(new CustomEvent("varynth_notification_updated"));
      window.dispatchEvent(new CustomEvent("varynth_jobs_updated"));
      window.dispatchEvent(new CustomEvent("varynth_guardian_updated"));
      window.dispatchEvent(new CustomEvent("BACKUP_RESTORE_COMPLETED", { detail: { mode, counts } }));

      athenaEventBus.emit("BACKUP_RESTORED", {
        mode,
        timestamp: new Date().toISOString(),
        entitiesCount: counts,
      });

      notificationService.create({
        type: "BACKUP_RESTORED",
        title: "Backup Restaurado com Sucesso",
        message: `Restauração concluída no modo ${mode}. Grafo criativo e assets sincronizados.`,
        severity: "SUCCESS",
        source: "SYSTEM",
      });

      return { success: true, restoredCount: counts };
    } catch (err: any) {
      return { success: false, error: `Erro ao gravar restauração: ${err?.message || err}` };
    }
  }
}

export const backupService = new BackupService();

