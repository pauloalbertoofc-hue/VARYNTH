"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Project,
  Task,
  Note,
  ProjectFile,
  ProjectReference,
  ProjectTimelineEvent,
  ActivityLog,
  ActorType,
  ActivityAction,
  EntityType,
  VaultItem,
  ChronosEvent,
  HistoricalMilestone,
  Person,
  LabItem,
  GraveyardItem,
  ArgumentThesis,
  EvidenceItem,
  AcademicResearch,
  Opportunity,
  OpportunityStatus,
  ForgeFile,
  TrashItem,
  TrashEntityType,
} from "../types";
import { showUndoToast } from "@/components/ui/UndoToast";
import { migrateVaultItem } from "@/lib/vault/taxonomy";

const STORAGE_KEYS = {
  PROJECTS: "varynth_os_projects",
  TASKS: "varynth_os_tasks",
  NOTES: "varynth_os_notes",
  FILES: "varynth_os_files",
  REFERENCES: "varynth_os_references",
  TIMELINE: "varynth_os_timeline",
  ACTIVITIES: "varynth_os_activities",
  VAULT: "varynth_os_vault",
  CHRONOS: "varynth_os_chronos",
  HISTORICAL: "varynth_os_historical",
  PEOPLE: "varynth_os_people",
  LABS: "varynth_os_labs",
  GRAVEYARD: "varynth_os_graveyard",
  THESES: "varynth_os_theses",
  RESEARCHES: "varynth_os_researches",
  EVIDENCES: "varynth_os_evidences",
  OPPORTUNITIES: "varynth_os_opportunities",
  FORGE: "varynth_os_forge",
  TRASH: "varynth_os_trash",
};

const STORE_UPDATE_EVENT = "varynth_store_update";
type AccountIdentity = { key: string; name: string; role: string };

function triggerStoreUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORE_UPDATE_EVENT));
  }
}

function pushVaultItems(items: VaultItem[]) {
  void fetch("/api/vault/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items }) }).catch(() => undefined);
}

export function useVarynthStore() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [chronosEvents, setChronosEvents] = useState<ChronosEvent[]>([]);
  const [historicalMilestones, setHistoricalMilestones] = useState<HistoricalMilestone[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [labItems, setLabItems] = useState<LabItem[]>([]);
  const [graveyardItems, setGraveyardItems] = useState<GraveyardItem[]>([]);
  const [theses, setTheses] = useState<ArgumentThesis[]>([]);
  const [researches, setResearches] = useState<AcademicResearch[]>([]);
  const [evidences, setEvidences] = useState<EvidenceItem[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [forgeFiles, setForgeFiles] = useState<ForgeFile[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [references, setReferences] = useState<ProjectReference[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<ProjectTimelineEvent[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [account, setAccount] = useState<AccountIdentity>();
  const vaultStorageKey = account ? `${STORAGE_KEYS.VAULT}:account:${account.key}` : undefined;

  useEffect(() => {
    let active = true;
    void import("next-auth/react").then(({ getSession }) => getSession()).then((session) => {
      if (!active) return;
      const user = session?.user as { id?: string; email?: string; name?: string; role?: string } | undefined;
      const raw = String(user?.id || user?.email || "local-owner").trim().toLowerCase();
      setAccount({ key: raw.replace(/[^a-z0-9]/g, "_"), name: user?.name?.trim() || "Você", role: user?.role || "owner" });
    }).catch(() => { if (active) setAccount({ key: "local-owner", name: "Paulo", role: "owner" }); });
    return () => { active = false; };
  }, []);

  // --- LOG ACTIVITY / AUDIT TRAIL SERVICE ---
  const logActivity = useCallback(
    (
      action: ActivityAction | string,
      entityType?: EntityType | string,
      entityId?: string,
      entityTitle?: string,
      actorType: ActorType = "user",
      metadata?: Record<string, unknown>,
      projectId?: string
    ) => {
      const newActivity: ActivityLog = {
        id: "act-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        action,
        entityType,
        entityId,
        entityTitle,
        actorType,
        user: actorType === "athena" ? "Athena AI" : actorType === "system" ? "Sistema" : "Paulo",
        projectId,
        metadata,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };
      try {
        const current: ActivityLog[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || "[]");
        const updated = [newActivity, ...current].slice(0, 150); // Keep last 150 audit entries
        localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
        triggerStoreUpdate();
      } catch {
        // ignore
      }
      return newActivity;
    },
    []
  );

  // --- DECOUPLED AUTO-PURGE FUNCTION (SERVER / CRON READY) ---
  const purgeExpiredTrashItems = useCallback(() => {
    try {
      const rawTrash: TrashItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRASH) || "[]");
      const now = Date.now();
      const validTrash: TrashItem[] = [];
      const expiredTrash: TrashItem[] = [];

      rawTrash.forEach((item) => {
        if (new Date(item.expiresAt).getTime() <= now) {
          expiredTrash.push(item);
        } else {
          const diffMs = new Date(item.expiresAt).getTime() - now;
          const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          validTrash.push({ ...item, daysRemaining: days });
        }
      });

      if (expiredTrash.length > 0) {
        localStorage.setItem(STORAGE_KEYS.TRASH, JSON.stringify(validTrash));
        expiredTrash.forEach((expired) => {
          logActivity(
            "destruiu_permanentemente",
            expired.entityType,
            expired.originalId,
            `Sistema destruiu permanentemente "${expired.title}" após expiração de 10 dias.`,
            "system",
            { originalExpiresAt: expired.expiresAt }
          );
        });
        triggerStoreUpdate();
      }
      return { purgedCount: expiredTrash.length, remainingCount: validTrash.length };
    } catch {
      return { purgedCount: 0, remainingCount: 0 };
    }
  }, [logActivity]);

  const loadData = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const defaultKeys = [
        STORAGE_KEYS.PROJECTS,
        STORAGE_KEYS.TASKS,
        STORAGE_KEYS.NOTES,
        STORAGE_KEYS.CHRONOS,
        STORAGE_KEYS.HISTORICAL,
        STORAGE_KEYS.PEOPLE,
        STORAGE_KEYS.LABS,
        STORAGE_KEYS.GRAVEYARD,
        STORAGE_KEYS.THESES,
        STORAGE_KEYS.RESEARCHES,
        STORAGE_KEYS.EVIDENCES,
        STORAGE_KEYS.OPPORTUNITIES,
        STORAGE_KEYS.FORGE,
        STORAGE_KEYS.FILES,
        STORAGE_KEYS.REFERENCES,
        STORAGE_KEYS.TIMELINE,
        STORAGE_KEYS.ACTIVITIES,
        STORAGE_KEYS.TRASH,
      ];

      defaultKeys.forEach((key) => {
        if (localStorage.getItem(key) === null) {
          localStorage.setItem(key, "[]");
        }
      });
      if (!vaultStorageKey) return;
      if (localStorage.getItem(vaultStorageKey) === null) {
        const legacy = (JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT) || "[]") as VaultItem[]).map(migrateVaultItem);
        const initial = account?.role === "owner" ? legacy : legacy.filter((item) => !["Diário de Anne Frank", "As 48 Leis do Poder", "A arte da Sedução"].includes(item.title));
        localStorage.setItem(vaultStorageKey, JSON.stringify(initial));
      }

      // Run auto purge
      purgeExpiredTrashItems();

      setProjects(JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || "[]"));
      setTasks(JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]"));
      setNotes(JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]"));
      const migratedVault = (JSON.parse(localStorage.getItem(vaultStorageKey) || "[]") as VaultItem[]).map(migrateVaultItem);
      localStorage.setItem(vaultStorageKey, JSON.stringify(migratedVault));
      setVaultItems(migratedVault);
      setChronosEvents(JSON.parse(localStorage.getItem(STORAGE_KEYS.CHRONOS) || "[]"));
      setHistoricalMilestones(JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORICAL) || "[]"));
      setPeople(JSON.parse(localStorage.getItem(STORAGE_KEYS.PEOPLE) || "[]"));
      setLabItems(JSON.parse(localStorage.getItem(STORAGE_KEYS.LABS) || "[]"));
      setGraveyardItems(JSON.parse(localStorage.getItem(STORAGE_KEYS.GRAVEYARD) || "[]"));
      setTheses(JSON.parse(localStorage.getItem(STORAGE_KEYS.THESES) || "[]"));
      setResearches(JSON.parse(localStorage.getItem(STORAGE_KEYS.RESEARCHES) || "[]"));
      setEvidences(JSON.parse(localStorage.getItem(STORAGE_KEYS.EVIDENCES) || "[]"));
      setOpportunities(JSON.parse(localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES) || "[]"));
      setForgeFiles(JSON.parse(localStorage.getItem(STORAGE_KEYS.FORGE) || "[]"));
      setFiles(JSON.parse(localStorage.getItem(STORAGE_KEYS.FILES) || "[]"));
      setReferences(JSON.parse(localStorage.getItem(STORAGE_KEYS.REFERENCES) || "[]"));
      setTimelineEvents(JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMELINE) || "[]"));
      setActivities(JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || "[]"));
      setTrashItems(JSON.parse(localStorage.getItem(STORAGE_KEYS.TRASH) || "[]"));
    } catch {
      // ignore
    }
    setIsLoaded(true);
  }, [account?.role, purgeExpiredTrashItems, vaultStorageKey]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener(STORE_UPDATE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(STORE_UPDATE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [loadData]);

  useEffect(() => {
    if (!vaultStorageKey) return;
    const synchronizeVault = async () => {
      try {
        const local = (JSON.parse(localStorage.getItem(vaultStorageKey) || "[]") as VaultItem[]).map(migrateVaultItem);
        const response = await fetch("/api/vault/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: local }) });
        if (!response.ok) return;
        const result = await response.json() as { items?: VaultItem[] };
        if (!result.items) return;
        const migrated = result.items.map(migrateVaultItem);
        localStorage.setItem(vaultStorageKey, JSON.stringify(migrated));
        setVaultItems(migrated);
      } catch {
        // A cópia local continua disponível quando o aparelho estiver offline.
      }
    };
    void synchronizeVault();
  }, [vaultStorageKey]);

  // --- TRASH HUB (10-DAY RETENTION, RESILIENT RESTORE & UNDO TOAST) ---
  const restoreFromTrash = useCallback(
    (trashId: string, actorType: ActorType = "user") => {
      const currentTrash: TrashItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRASH) || "[]");
      const itemToRestore = currentTrash.find((t) => t.id === trashId);
      if (!itemToRestore) return null;

      const remainingTrash = currentTrash.filter((t) => t.id !== trashId);
      localStorage.setItem(STORAGE_KEYS.TRASH, JSON.stringify(remainingTrash));

      let entity: any = itemToRestore.data;
      let hasConflict = false;

      // Helper to check ID collision and resolve
      const checkAndResolveCollision = (storageKey: string) => {
        const list: any[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
        const idExists = list.some((item) => item.id === entity.id);
        if (idExists) {
          hasConflict = true;
          const oldId = entity.id;
          const newId = `${oldId}-restored-${Date.now()}`;
          entity = { ...entity, id: newId, originalIdBeforeConflict: oldId };
        }
        localStorage.setItem(storageKey, JSON.stringify([entity, ...list]));
      };

      switch (itemToRestore.entityType) {
        case "projeto":
          checkAndResolveCollision(STORAGE_KEYS.PROJECTS);
          break;
        case "tarefa":
          checkAndResolveCollision(STORAGE_KEYS.TASKS);
          break;
        case "nota":
          checkAndResolveCollision(STORAGE_KEYS.NOTES);
          break;
        case "vault":
          checkAndResolveCollision(vaultStorageKey || STORAGE_KEYS.VAULT);
          break;
        case "tese":
          checkAndResolveCollision(STORAGE_KEYS.THESES);
          break;
        case "evidencia":
          checkAndResolveCollision(STORAGE_KEYS.EVIDENCES);
          break;
        case "edital":
          checkAndResolveCollision(STORAGE_KEYS.OPPORTUNITIES);
          break;
        case "codigo":
          checkAndResolveCollision(STORAGE_KEYS.FORGE);
          break;
        case "pessoa":
          checkAndResolveCollision(STORAGE_KEYS.PEOPLE);
          break;
        case "ideia":
          checkAndResolveCollision(STORAGE_KEYS.LABS);
          break;
        case "evento":
          checkAndResolveCollision(STORAGE_KEYS.CHRONOS);
          break;
      }

      logActivity(
        "restaurou",
        itemToRestore.entityType,
        entity.id,
        hasConflict
          ? `Restaurou "${itemToRestore.title}" com novo identificador porque o ID original já estava em uso.`
          : `Restaurou "${itemToRestore.title}" da Lixeira`,
        actorType,
        { originalPath: itemToRestore.originalPath, hasConflict }
      );

      triggerStoreUpdate();
      return entity;
    },
    [logActivity]
  );

  const moveToTrash = useCallback(
    (
      entityType: TrashEntityType,
      originalId: string,
      title: string,
      data: unknown,
      options?: {
        deletedBy?: string;
        deletedByType?: ActorType;
        source?: "manual" | "athena" | "system";
        originalPath?: string;
      }
    ) => {
      const now = new Date();
      const expires = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days

      const newTrashItem: TrashItem = {
        id: "trash-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        originalId,
        entityType,
        title,
        data,
        deletedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        daysRemaining: 10,
        deletedBy: options?.deletedBy || "Paulo",
        deletedByType: options?.deletedByType || "user",
        source: options?.source || "manual",
        schemaVersion: 1,
        originalPath: options?.originalPath || (typeof window !== "undefined" ? window.location.pathname : undefined),
      };

      const currentTrash: TrashItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRASH) || "[]");
      const updatedTrash = [newTrashItem, ...currentTrash];
      localStorage.setItem(STORAGE_KEYS.TRASH, JSON.stringify(updatedTrash));

      // Audit Log
      logActivity(
        "moveu_lixeira",
        entityType,
        originalId,
        `Moveu "${title}" para a Lixeira (Retenção de 10 dias)`,
        options?.deletedByType || "user",
        { trashId: newTrashItem.id, originalPath: newTrashItem.originalPath }
      );

      // Trigger Global Undo Toast
      showUndoToast({
        id: newTrashItem.id,
        message: `${entityType.toUpperCase()}: "${title}" movido para a Lixeira`,
        actionLabel: "Desfazer",
        onUndo: () => restoreFromTrash(newTrashItem.id),
      });

      triggerStoreUpdate();
      return newTrashItem;
    },
    [logActivity, restoreFromTrash]
  );

  const permanentDeleteTrash = useCallback(
    (trashId: string, actorType: ActorType = "user") => {
      const currentTrash: TrashItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRASH) || "[]");
      const target = currentTrash.find((t) => t.id === trashId);
      const remainingTrash = currentTrash.filter((t) => t.id !== trashId);
      localStorage.setItem(STORAGE_KEYS.TRASH, JSON.stringify(remainingTrash));
      if (target) {
        logActivity(
          "destruiu_permanentemente",
          target.entityType,
          target.originalId,
          `Destruiu permanentemente "${target.title}"`,
          actorType
        );
      }
      triggerStoreUpdate();
    },
    [logActivity]
  );

  const emptyTrash = useCallback(
    (actorType: ActorType = "user") => {
      const currentTrash: TrashItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRASH) || "[]");
      const count = currentTrash.length;
      localStorage.setItem(STORAGE_KEYS.TRASH, "[]");
      logActivity(
        "esvaziou_lixeira",
        "lixeira",
        "trash-all",
        `Esvaziou a Lixeira do VARYNTH (${count} itens destruídos permanentemente)`,
        actorType,
        { itemCount: count }
      );
      triggerStoreUpdate();
    },
    [logActivity]
  );

  // --- PROJECTS ---
  const addProject = useCallback(
    (projectData: Omit<Project, "id" | "createdAt" | "updatedAt">, actorType: ActorType = "user") => {
      const newProject: Project = {
        ...projectData,
        id: "proj-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || "[]");
      const updated = [newProject, ...current];
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
      logActivity("criou", "projeto", newProject.id, newProject.title, actorType);
      triggerStoreUpdate();
      return newProject;
    },
    [logActivity]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>, actorType: ActorType = "user") => {
      const current: Project[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || "[]");
      const updated = current.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      );
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
      const target = updated.find((p) => p.id === id);
      if (target) {
        logActivity("atualizou", "projeto", id, target.title, actorType);
      }
      triggerStoreUpdate();
    },
    [logActivity]
  );

  const deleteProject = useCallback(
    (id: string, actorType: ActorType = "user") => {
      const current: Project[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || "[]");
      const target = current.find((p) => p.id === id);
      let trashItem: TrashItem | undefined;
      if (target) {
        trashItem = moveToTrash("projeto", target.id, target.title, target, {
          deletedByType: actorType,
          source: actorType === "athena" ? "athena" : "manual",
          originalPath: `/projects/${target.id}`,
        });
      }
      const updated = current.filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
      triggerStoreUpdate();
      return trashItem;
    },
    [moveToTrash]
  );

  // --- TASKS ---
  const addTask = useCallback(
    (taskData: Omit<Task, "id" | "createdAt">, actorType: ActorType = "user") => {
      const newTask: Task = {
        ...taskData,
        id: "task-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
      const updated = [newTask, ...current];
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
      logActivity("criou", "tarefa", newTask.id, newTask.title, actorType, undefined, newTask.projectId);
      triggerStoreUpdate();
      return newTask;
    },
    [logActivity]
  );

  const toggleTask = useCallback(
    (id: string, actorType: ActorType = "user") => {
      const current: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
      const updated = current.map((t) => {
        if (t.id === id) {
          const isDone = t.status === "concluida";
          return {
            ...t,
            status: (isDone ? "a_fazer" : "concluida") as Task["status"],
            completedAt: isDone ? undefined : new Date().toISOString(),
          };
        }
        return t;
      });
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
      const target = updated.find((t) => t.id === id);
      if (target) {
        logActivity(
          target.status === "concluida" ? "concluiu" : "atualizou",
          "tarefa",
          id,
          target.title,
          actorType,
          undefined,
          target.projectId
        );
      }
      triggerStoreUpdate();
    },
    [logActivity]
  );

  const updateTask = useCallback((id: string, updates: Partial<Task>, actorType: ActorType = "user") => {
    const current: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
    const updated = current.map((t) => (t.id === id ? { ...t, ...updates } : t));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
    const target = updated.find((t) => t.id === id);
    if (target) {
      logActivity("atualizou", "tarefa", id, target.title, actorType, undefined, target.projectId);
    }
    triggerStoreUpdate();
  }, [logActivity]);

  const deleteTask = useCallback(
    (id: string, actorType: ActorType = "user") => {
      const current: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
      const target = current.find((t) => t.id === id);
      let trashItem: TrashItem | undefined;
      if (target) {
        trashItem = moveToTrash("tarefa", target.id, target.title, target, {
          deletedByType: actorType,
          originalPath: target.projectId ? `/projects/${target.projectId}` : "/dashboard",
        });
      }
      const updated = current.filter((t) => t.id !== id);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
      triggerStoreUpdate();
      return trashItem;
    },
    [moveToTrash]
  );

  // --- NOTES ---
  const addNote = useCallback(
    (noteData: Omit<Note, "id" | "createdAt" | "updatedAt">, actorType: ActorType = "user") => {
      const newNote: Note = {
        ...noteData,
        id: "note-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
      const updated = [newNote, ...current];
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
      logActivity("criou", "nota", newNote.id, newNote.title, actorType, undefined, newNote.projectId);
      triggerStoreUpdate();
      return newNote;
    },
    [logActivity]
  );

  const updateNote = useCallback((id: string, updates: Partial<Note>, actorType: ActorType = "user") => {
    const current: Note[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
    const updated = current.map((n) =>
      n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
    );
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deleteNote = useCallback(
    (id: string, actorType: ActorType = "user") => {
      const current: Note[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
      const target = current.find((n) => n.id === id);
      if (target) {
        moveToTrash("nota", target.id, target.title, target, {
          deletedByType: actorType,
          originalPath: target.projectId ? `/projects/${target.projectId}` : "/dashboard",
        });
      }
      const updated = current.filter((n) => n.id !== id);
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- VAULT ---
  const addVaultItem = useCallback(
    (itemData: Omit<VaultItem, "id" | "createdAt" | "updatedAt">, actorType: ActorType = "user") => {
      const newItem: VaultItem = {
        ...itemData,
        id: "vault-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(vaultStorageKey || STORAGE_KEYS.VAULT) || "[]");
      const updated = [newItem, ...current];
      localStorage.setItem(vaultStorageKey || STORAGE_KEYS.VAULT, JSON.stringify(updated));
      pushVaultItems(updated);
      logActivity("criou", "vault", newItem.id, newItem.title, actorType);
      triggerStoreUpdate();
      return newItem;
    },
    [logActivity]
  );

  const updateVaultItem = useCallback((id: string, updates: Partial<VaultItem>) => {
    const current: VaultItem[] = JSON.parse(localStorage.getItem(vaultStorageKey || STORAGE_KEYS.VAULT) || "[]");
    const updated = current.map((item) =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    );
    localStorage.setItem(vaultStorageKey || STORAGE_KEYS.VAULT, JSON.stringify(updated));
    pushVaultItems(updated);
    triggerStoreUpdate();
  }, []);

  const deleteVaultItem = useCallback(
    (id: string, actorType: ActorType = "user") => {
      const current: VaultItem[] = JSON.parse(localStorage.getItem(vaultStorageKey || STORAGE_KEYS.VAULT) || "[]");
      const target = current.find((item) => item.id === id);
      if (target) {
        moveToTrash("vault", target.id, target.title, target, {
          deletedByType: actorType,
          originalPath: "/modules/vault",
        });
      }
      const updated = current.filter((item) => item.id !== id);
      localStorage.setItem(vaultStorageKey || STORAGE_KEYS.VAULT, JSON.stringify(updated));
      void fetch(`/api/vault/sync?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- CHRONOS ---
  const addChronosEvent = useCallback(
    (eventData: Omit<ChronosEvent, "id" | "createdAt">, actorType: ActorType = "user") => {
      const newEvent: ChronosEvent = {
        ...eventData,
        id: "chronos-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHRONOS) || "[]");
      const updated = [newEvent, ...current];
      localStorage.setItem(STORAGE_KEYS.CHRONOS, JSON.stringify(updated));
      logActivity("criou", "evento", newEvent.id, newEvent.title, actorType);
      triggerStoreUpdate();
      return newEvent;
    },
    [logActivity]
  );

  const updateChronosEvent = useCallback((id: string, updates: Partial<ChronosEvent>) => {
    const current: ChronosEvent[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHRONOS) || "[]");
    const updated = current.map((e) => (e.id === id ? { ...e, ...updates } : e));
    localStorage.setItem(STORAGE_KEYS.CHRONOS, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deleteChronosEvent = useCallback(
    (id: string, actorType: ActorType = "user") => {
      const current: ChronosEvent[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHRONOS) || "[]");
      const target = current.find((e) => e.id === id);
      if (target) {
        moveToTrash("evento", target.id, target.title, target, {
          deletedByType: actorType,
          originalPath: "/modules/chronos",
        });
      }
      const updated = current.filter((e) => e.id !== id);
      localStorage.setItem(STORAGE_KEYS.CHRONOS, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  const addHistoricalMilestone = useCallback(
    (milestoneData: Omit<HistoricalMilestone, "id">, actorType: ActorType = "user") => {
      const newMilestone: HistoricalMilestone = {
        ...milestoneData,
        id: "hist-" + Date.now(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORICAL) || "[]");
      const updated = [newMilestone, ...current];
      localStorage.setItem(STORAGE_KEYS.HISTORICAL, JSON.stringify(updated));
      logActivity("criou", "evento", newMilestone.id, newMilestone.title, actorType);
      triggerStoreUpdate();
      return newMilestone;
    },
    [logActivity]
  );

  const deleteHistoricalMilestone = useCallback((id: string) => {
    const current: HistoricalMilestone[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORICAL) || "[]");
    const updated = current.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.HISTORICAL, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  // --- PEOPLE ---
  const addPerson = useCallback(
    (personData: Omit<Person, "id" | "createdAt">, actorType: ActorType = "user") => {
      const newPerson: Person = {
        ...personData,
        id: "person-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.PEOPLE) || "[]");
      const updated = [newPerson, ...current];
      localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(updated));
      logActivity("criou", "pessoa", newPerson.id, newPerson.name, actorType);
      triggerStoreUpdate();
      return newPerson;
    },
    [logActivity]
  );

  const updatePerson = useCallback((id: string, updates: Partial<Person>) => {
    const current: Person[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PEOPLE) || "[]");
    const updated = current.map((p) => (p.id === id ? { ...p, ...updates } : p));
    localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deletePerson = useCallback(
    (id: string, actorType: ActorType = "user") => {
      const current: Person[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PEOPLE) || "[]");
      const target = current.find((p) => p.id === id);
      if (target) {
        moveToTrash("pessoa", target.id, target.name, target, {
          deletedByType: actorType,
          originalPath: "/modules/people",
        });
      }
      const updated = current.filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- LABS & GRAVEYARD ---
  const addLabItem = useCallback(
    (labData: Omit<LabItem, "id" | "createdAt" | "updatedAt">, actorType: ActorType = "user") => {
      const newItem: LabItem = {
        ...labData,
        id: "lab-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.LABS) || "[]");
      const updated = [newItem, ...current];
      localStorage.setItem(STORAGE_KEYS.LABS, JSON.stringify(updated));
      logActivity("criou", "ideia", newItem.id, newItem.title, actorType);
      triggerStoreUpdate();
      return newItem;
    },
    [logActivity]
  );

  const updateLabItem = useCallback((id: string, updates: Partial<LabItem>) => {
    const current: LabItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LABS) || "[]");
    const updated = current.map((item) =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    );
    localStorage.setItem(STORAGE_KEYS.LABS, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deleteLabItem = useCallback(
    (id: string, actorType: ActorType = "user") => {
      const current: LabItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LABS) || "[]");
      const target = current.find((item) => item.id === id);
      if (target) {
        moveToTrash("ideia", target.id, target.title, target, {
          deletedByType: actorType,
          originalPath: "/modules/labs",
        });
      }
      const updated = current.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEYS.LABS, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  const promoteLabToProject = useCallback(
    (labId: string, actorType: ActorType = "user") => {
      const labs: LabItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LABS) || "[]");
      const target = labs.find((l) => l.id === labId);
      if (!target) return null;

      const newProj = addProject(
        {
          title: target.title,
          description: `${target.description}${target.hypothesis ? `\n\nHipótese Inicial: ${target.hypothesis}` : ""}`,
          category: target.category,
          status: "ativo",
          priority: "alta",
          tags: [...target.tags, "promovido-do-labs"],
          progress: 10,
        },
        actorType
      );

      if (target.notes) {
        addNote(
          {
            projectId: newProj.id,
            title: `Notas de Incubação (Labs) — ${target.title}`,
            content: target.notes,
            tags: ["labs", "historico"],
            pinned: true,
          },
          actorType
        );
      }

      updateLabItem(labId, { stage: "promovido", promotedProjectId: newProj.id });
      logActivity("promoveu", "ideia", target.id, `Promoveu a ideia "${target.title}" para o Projeto "${newProj.title}"`, actorType);
      return newProj;
    },
    [addProject, addNote, updateLabItem, logActivity]
  );

  const addGraveyardItem = useCallback(
    (graveData: Omit<GraveyardItem, "id" | "createdAt">, actorType: ActorType = "user") => {
      const newItem: GraveyardItem = {
        ...graveData,
        id: "grave-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRAVEYARD) || "[]");
      const updated = [newItem, ...current];
      localStorage.setItem(STORAGE_KEYS.GRAVEYARD, JSON.stringify(updated));
      logActivity("arquivou", "projeto", newItem.id, newItem.title, actorType);
      triggerStoreUpdate();
      return newItem;
    },
    [logActivity]
  );

  const deleteGraveyardItem = useCallback((id: string) => {
    const current: GraveyardItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRAVEYARD) || "[]");
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.GRAVEYARD, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  // --- CODEX ---
  const addThesis = useCallback(
    (thesisData: Omit<ArgumentThesis, "id" | "createdAt" | "updatedAt">, actorType: ActorType = "user") => {
      const newThesis: ArgumentThesis = {
        ...thesisData,
        id: "thesis-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.THESES) || "[]");
      const updated = [newThesis, ...current];
      localStorage.setItem(STORAGE_KEYS.THESES, JSON.stringify(updated));
      logActivity("criou", "tese", newThesis.id, newThesis.title, actorType);
      triggerStoreUpdate();
      return newThesis;
    },
    [logActivity]
  );

  const updateThesis = useCallback((id: string, updates: Partial<ArgumentThesis>) => {
    const current: ArgumentThesis[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.THESES) || "[]");
    const updated = current.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    );
    localStorage.setItem(STORAGE_KEYS.THESES, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deleteThesis = useCallback(
    (id: string, actorType: ActorType = "user") => {
      const current: ArgumentThesis[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.THESES) || "[]");
      const target = current.find((t) => t.id === id);
      if (target) {
        moveToTrash("tese", target.id, target.title, target, {
          deletedByType: actorType,
          originalPath: "/modules/codex",
        });
      }
      const updated = current.filter((t) => t.id !== id);
      localStorage.setItem(STORAGE_KEYS.THESES, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- RESEARCH ---
  const addResearch = useCallback(
    (resData: Omit<AcademicResearch, "id" | "createdAt">, actorType: ActorType = "user") => {
      const newRes: AcademicResearch = {
        ...resData,
        id: "res-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESEARCHES) || "[]");
      const updated = [newRes, ...current];
      localStorage.setItem(STORAGE_KEYS.RESEARCHES, JSON.stringify(updated));
      logActivity("criou", "pesquisa", newRes.id, newRes.title, actorType);
      triggerStoreUpdate();
      return newRes;
    },
    [logActivity]
  );

  const updateResearch = useCallback((id: string, updates: Partial<AcademicResearch>) => {
    const current: AcademicResearch[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESEARCHES) || "[]");
    const updated = current.map((r) => (r.id === id ? { ...r, ...updates } : r));
    localStorage.setItem(STORAGE_KEYS.RESEARCHES, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deleteResearch = useCallback(
    (id: string, actorType: ActorType = "user") => {
      const current: AcademicResearch[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESEARCHES) || "[]");
      const target = current.find((r) => r.id === id);
      if (target) {
        moveToTrash("evidencia", target.id, target.title, target, {
          deletedByType: actorType,
          originalPath: "/modules/research",
        });
      }
      const updated = current.filter((r) => r.id !== id);
      localStorage.setItem(STORAGE_KEYS.RESEARCHES, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  const addEvidence = useCallback(
    (eviData: Omit<EvidenceItem, "id" | "createdAt">, actorType: ActorType = "user") => {
      const newEvi: EvidenceItem = {
        ...eviData,
        id: "evi-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVIDENCES) || "[]");
      const updated = [newEvi, ...current];
      localStorage.setItem(STORAGE_KEYS.EVIDENCES, JSON.stringify(updated));
      logActivity("criou", "evidencia", newEvi.id, newEvi.claim, actorType);
      triggerStoreUpdate();
      return newEvi;
    },
    [logActivity]
  );

  const updateEvidence = useCallback((id: string, updates: Partial<EvidenceItem>) => {
    const current: EvidenceItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVIDENCES) || "[]");
    const updated = current.map((e) => (e.id === id ? { ...e, ...updates } : e));
    localStorage.setItem(STORAGE_KEYS.EVIDENCES, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deleteEvidence = useCallback(
    (id: string, actorType: ActorType = "user") => {
      const current: EvidenceItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVIDENCES) || "[]");
      const target = current.find((e) => e.id === id);
      if (target) {
        moveToTrash("evidencia", target.id, target.claim, target, {
          deletedByType: actorType,
          originalPath: "/modules/research",
        });
      }
      const updated = current.filter((e) => e.id !== id);
      localStorage.setItem(STORAGE_KEYS.EVIDENCES, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- OPPORTUNITIES ---
  const addOpportunity = useCallback(
    (oppData: Omit<Opportunity, "id" | "createdAt" | "updatedAt">, actorType: ActorType = "user") => {
      const newOpp: Opportunity = {
        ...oppData,
        id: "opp-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES) || "[]");
      const updated = [newOpp, ...current];
      localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(updated));
      logActivity("criou", "edital", newOpp.id, newOpp.title, actorType);
      triggerStoreUpdate();
      return newOpp;
    },
    [logActivity]
  );

  const updateOpportunity = useCallback((id: string, updates: Partial<Opportunity>) => {
    const current: Opportunity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES) || "[]");
    const updated = current.map((o) =>
      o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
    );
    localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deleteOpportunity = useCallback(
    (id: string, actorType: ActorType = "user") => {
      const current: Opportunity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES) || "[]");
      const target = current.find((o) => o.id === id);
      if (target) {
        moveToTrash("edital", target.id, target.title, target, {
          deletedByType: actorType,
          originalPath: "/modules/opportunities",
        });
      }
      const updated = current.filter((o) => o.id !== id);
      localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- FORGE STUDIO ---
  const addForgeFile = useCallback(
    (fileData: Omit<ForgeFile, "id" | "createdAt" | "updatedAt">, actorType: ActorType = "user") => {
      const newFile: ForgeFile = {
        ...fileData,
        id: "forge-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORGE) || "[]");
      const updated = [newFile, ...current];
      localStorage.setItem(STORAGE_KEYS.FORGE, JSON.stringify(updated));
      logActivity("criou", "codigo", newFile.id, newFile.name, actorType);
      triggerStoreUpdate();
      return newFile;
    },
    [logActivity]
  );

  const updateForgeFile = useCallback((id: string, updates: Partial<ForgeFile>) => {
    const current: ForgeFile[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORGE) || "[]");
    const updated = current.map((f) =>
      f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f
    );
    localStorage.setItem(STORAGE_KEYS.FORGE, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deleteForgeFile = useCallback(
    (id: string, actorType: ActorType = "user") => {
      const current: ForgeFile[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORGE) || "[]");
      const target = current.find((f) => f.id === id);
      if (target) {
        moveToTrash("codigo", target.id, target.name, target, {
          deletedByType: actorType,
          originalPath: "/modules/forge",
        });
      }
      const updated = current.filter((f) => f.id !== id);
      localStorage.setItem(STORAGE_KEYS.FORGE, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- REFERENCES & TIMELINE ---
  const addReference = useCallback(
    (refData: Omit<ProjectReference, "id" | "createdAt">, actorType: ActorType = "user") => {
      const newRef: ProjectReference = {
        ...refData,
        id: "ref-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.REFERENCES) || "[]");
      const updated = [newRef, ...current];
      localStorage.setItem(STORAGE_KEYS.REFERENCES, JSON.stringify(updated));
      logActivity("criou", "referencia", newRef.id, newRef.title, actorType, undefined, newRef.projectId);
      triggerStoreUpdate();
      return newRef;
    },
    [logActivity]
  );

  const deleteReference = useCallback((id: string) => {
    const current: ProjectReference[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.REFERENCES) || "[]");
    const updated = current.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REFERENCES, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const addTimelineEvent = useCallback((eventData: Omit<ProjectTimelineEvent, "id">, actorType: ActorType = "user") => {
    const newEvent: ProjectTimelineEvent = {
      ...eventData,
      id: "time-" + Date.now(),
    };
    const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMELINE) || "[]");
    const updated = [newEvent, ...current];
    localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(updated));
    triggerStoreUpdate();
    return newEvent;
  }, []);

  const deleteTimelineEvent = useCallback((id: string) => {
    const current: ProjectTimelineEvent[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMELINE) || "[]");
    const updated = current.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  return {
    isLoaded,
    accountName: account?.name || "Você",
    projects,
    tasks,
    notes,
    vaultItems,
    chronosEvents,
    historicalMilestones,
    people,
    labItems,
    graveyardItems,
    theses,
    researches,
    evidences,
    opportunities,
    forgeFiles,
    files,
    references,
    timelineEvents,
    activities,
    trashItems,
    // Actions
    addProject,
    updateProject,
    deleteProject,
    addTask,
    toggleTask,
    updateTask,
    deleteTask,
    addNote,
    updateNote,
    deleteNote,
    addVaultItem,
    updateVaultItem,
    deleteVaultItem,
    addChronosEvent,
    updateChronosEvent,
    deleteChronosEvent,
    addHistoricalMilestone,
    deleteHistoricalMilestone,
    addPerson,
    updatePerson,
    deletePerson,
    addLabItem,
    updateLabItem,
    deleteLabItem,
    promoteLabToProject,
    addGraveyardItem,
    deleteGraveyardItem,
    addThesis,
    updateThesis,
    deleteThesis,
    addResearch,
    updateResearch,
    deleteResearch,
    addEvidence,
    updateEvidence,
    deleteEvidence,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    addForgeFile,
    updateForgeFile,
    deleteForgeFile,
    addReference,
    deleteReference,
    addTimelineEvent,
    deleteTimelineEvent,
    moveToTrash,
    restoreFromTrash,
    permanentDeleteTrash,
    emptyTrash,
    purgeExpiredTrashItems,
    logActivity,
  };
}
