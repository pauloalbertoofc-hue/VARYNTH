"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Project,
  Task,
  Note,
  ProjectFile,
  ProjectReference,
  ProjectTimelineEvent,
  Activity,
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

function triggerStoreUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORE_UPDATE_EVENT));
  }
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadData = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const defaultKeys = [
        STORAGE_KEYS.PROJECTS,
        STORAGE_KEYS.TASKS,
        STORAGE_KEYS.NOTES,
        STORAGE_KEYS.VAULT,
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

      // 10-day Auto-Purge of expired trash
      const rawTrash: TrashItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRASH) || "[]");
      const now = Date.now();
      const validTrash = rawTrash
        .filter((item) => new Date(item.expiresAt).getTime() > now)
        .map((item) => {
          const diffMs = new Date(item.expiresAt).getTime() - now;
          const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          return { ...item, daysRemaining: days };
        });

      if (validTrash.length !== rawTrash.length) {
        localStorage.setItem(STORAGE_KEYS.TRASH, JSON.stringify(validTrash));
      }

      setProjects(JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || "[]"));
      setTasks(JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]"));
      setNotes(JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]"));
      setVaultItems(JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT) || "[]"));
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
      setTrashItems(validTrash);
    } catch {
      // ignore
    }
    setIsLoaded(true);
  }, []);

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

  const logActivity = useCallback(
    (
      action: Activity["action"],
      entityType: Activity["entityType"],
      entityId: string,
      entityTitle: string,
      projectId?: string
    ) => {
      const newActivity: Activity = {
        id: "act-" + Date.now(),
        action,
        entityType,
        entityId,
        entityTitle,
        projectId,
        timestamp: new Date().toISOString(),
        user: "Paulo",
      };
      try {
        const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || "[]");
        const updated = [newActivity, ...current].slice(0, 60);
        localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
        triggerStoreUpdate();
      } catch {
        // ignore
      }
    },
    []
  );

  // --- TRASH HUB (10-DAY RETENTION & SOFT DELETE) ---
  const moveToTrash = useCallback(
    (entityType: TrashEntityType, originalId: string, title: string, data: unknown) => {
      const now = new Date();
      const expires = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days

      const newTrashItem: TrashItem = {
        id: "trash-" + Date.now(),
        originalId,
        entityType,
        title,
        data,
        deletedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        daysRemaining: 10,
      };

      const currentTrash: TrashItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRASH) || "[]");
      const updatedTrash = [newTrashItem, ...currentTrash];
      localStorage.setItem(STORAGE_KEYS.TRASH, JSON.stringify(updatedTrash));

      logActivity("removeu", "projeto", originalId, `Moveu "${title}" para a Lixeira (10 dias)`);
      triggerStoreUpdate();
      return newTrashItem;
    },
    [logActivity]
  );

  const restoreFromTrash = useCallback(
    (trashId: string) => {
      const currentTrash: TrashItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRASH) || "[]");
      const itemToRestore = currentTrash.find((t) => t.id === trashId);
      if (!itemToRestore) return;

      const remainingTrash = currentTrash.filter((t) => t.id !== trashId);
      localStorage.setItem(STORAGE_KEYS.TRASH, JSON.stringify(remainingTrash));

      // Put item back into original store array
      const entity = itemToRestore.data;
      switch (itemToRestore.entityType) {
        case "projeto": {
          const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || "[]");
          localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([entity, ...list]));
          break;
        }
        case "tarefa": {
          const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
          localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([entity, ...list]));
          break;
        }
        case "nota": {
          const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
          localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify([entity, ...list]));
          break;
        }
        case "vault": {
          const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT) || "[]");
          localStorage.setItem(STORAGE_KEYS.VAULT, JSON.stringify([entity, ...list]));
          break;
        }
        case "tese": {
          const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.THESES) || "[]");
          localStorage.setItem(STORAGE_KEYS.THESES, JSON.stringify([entity, ...list]));
          break;
        }
        case "evidencia": {
          const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVIDENCES) || "[]");
          localStorage.setItem(STORAGE_KEYS.EVIDENCES, JSON.stringify([entity, ...list]));
          break;
        }
        case "edital": {
          const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES) || "[]");
          localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify([entity, ...list]));
          break;
        }
        case "codigo": {
          const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORGE) || "[]");
          localStorage.setItem(STORAGE_KEYS.FORGE, JSON.stringify([entity, ...list]));
          break;
        }
        case "pessoa": {
          const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.PEOPLE) || "[]");
          localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify([entity, ...list]));
          break;
        }
        case "ideia": {
          const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.LABS) || "[]");
          localStorage.setItem(STORAGE_KEYS.LABS, JSON.stringify([entity, ...list]));
          break;
        }
        case "evento": {
          const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHRONOS) || "[]");
          localStorage.setItem(STORAGE_KEYS.CHRONOS, JSON.stringify([entity, ...list]));
          break;
        }
      }

      logActivity("criou", "projeto", itemToRestore.originalId, `Restaurou "${itemToRestore.title}" da Lixeira`);
      triggerStoreUpdate();
    },
    [logActivity]
  );

  const permanentDeleteTrash = useCallback(
    (trashId: string) => {
      const currentTrash: TrashItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRASH) || "[]");
      const target = currentTrash.find((t) => t.id === trashId);
      const remainingTrash = currentTrash.filter((t) => t.id !== trashId);
      localStorage.setItem(STORAGE_KEYS.TRASH, JSON.stringify(remainingTrash));
      if (target) {
        logActivity("removeu", "projeto", target.originalId, `Destruiu permanentemente "${target.title}"`);
      }
      triggerStoreUpdate();
    },
    [logActivity]
  );

  const emptyTrash = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.TRASH, "[]");
    logActivity("removeu", "projeto", "trash-all", "Esvaziou a Lixeira do VARYNTH");
    triggerStoreUpdate();
  }, [logActivity]);

  // --- PROJECTS ---
  const addProject = useCallback(
    (projectData: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
      const newProject: Project = {
        ...projectData,
        id: "proj-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || "[]");
      const updated = [newProject, ...current];
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
      logActivity("criou", "projeto", newProject.id, newProject.title);
      triggerStoreUpdate();
      return newProject;
    },
    [logActivity]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      const current: Project[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || "[]");
      const updated = current.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      );
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
      const target = updated.find((p) => p.id === id);
      if (target) {
        logActivity("atualizou", "projeto", id, target.title);
      }
      triggerStoreUpdate();
    },
    [logActivity]
  );

  const deleteProject = useCallback(
    (id: string) => {
      const current: Project[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || "[]");
      const target = current.find((p) => p.id === id);
      if (target) {
        moveToTrash("projeto", target.id, target.title, target);
      }
      const updated = current.filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- TASKS ---
  const addTask = useCallback(
    (taskData: Omit<Task, "id" | "createdAt">) => {
      const newTask: Task = {
        ...taskData,
        id: "task-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
      const updated = [newTask, ...current];
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
      logActivity("criou", "tarefa", newTask.id, newTask.title, newTask.projectId);
      triggerStoreUpdate();
      return newTask;
    },
    [logActivity]
  );

  const toggleTask = useCallback(
    (id: string) => {
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
          target.projectId
        );
      }
      triggerStoreUpdate();
    },
    [logActivity]
  );

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    const current: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
    const updated = current.map((t) => (t.id === id ? { ...t, ...updates } : t));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deleteTask = useCallback(
    (id: string) => {
      const current: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
      const target = current.find((t) => t.id === id);
      if (target) {
        moveToTrash("tarefa", target.id, target.title, target);
      }
      const updated = current.filter((t) => t.id !== id);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- NOTES ---
  const addNote = useCallback(
    (noteData: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
      const newNote: Note = {
        ...noteData,
        id: "note-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
      const updated = [newNote, ...current];
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
      logActivity("criou", "nota", newNote.id, newNote.title, newNote.projectId);
      triggerStoreUpdate();
      return newNote;
    },
    [logActivity]
  );

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    const current: Note[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
    const updated = current.map((n) =>
      n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
    );
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deleteNote = useCallback(
    (id: string) => {
      const current: Note[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
      const target = current.find((n) => n.id === id);
      if (target) {
        moveToTrash("nota", target.id, target.title, target);
      }
      const updated = current.filter((n) => n.id !== id);
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- VAULT ---
  const addVaultItem = useCallback(
    (itemData: Omit<VaultItem, "id" | "createdAt" | "updatedAt">) => {
      const newItem: VaultItem = {
        ...itemData,
        id: "vault-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT) || "[]");
      const updated = [newItem, ...current];
      localStorage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(updated));
      logActivity("criou", "referencia", newItem.id, newItem.title);
      triggerStoreUpdate();
      return newItem;
    },
    [logActivity]
  );

  const updateVaultItem = useCallback((id: string, updates: Partial<VaultItem>) => {
    const current: VaultItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT) || "[]");
    const updated = current.map((item) =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    );
    localStorage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deleteVaultItem = useCallback(
    (id: string) => {
      const current: VaultItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT) || "[]");
      const target = current.find((item) => item.id === id);
      if (target) {
        moveToTrash("vault", target.id, target.title, target);
      }
      const updated = current.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- CHRONOS ---
  const addChronosEvent = useCallback(
    (eventData: Omit<ChronosEvent, "id" | "createdAt">) => {
      const newEvent: ChronosEvent = {
        ...eventData,
        id: "chronos-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHRONOS) || "[]");
      const updated = [newEvent, ...current];
      localStorage.setItem(STORAGE_KEYS.CHRONOS, JSON.stringify(updated));
      triggerStoreUpdate();
      return newEvent;
    },
    []
  );

  const updateChronosEvent = useCallback((id: string, updates: Partial<ChronosEvent>) => {
    const current: ChronosEvent[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHRONOS) || "[]");
    const updated = current.map((e) => (e.id === id ? { ...e, ...updates } : e));
    localStorage.setItem(STORAGE_KEYS.CHRONOS, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deleteChronosEvent = useCallback(
    (id: string) => {
      const current: ChronosEvent[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHRONOS) || "[]");
      const target = current.find((e) => e.id === id);
      if (target) {
        moveToTrash("evento", target.id, target.title, target);
      }
      const updated = current.filter((e) => e.id !== id);
      localStorage.setItem(STORAGE_KEYS.CHRONOS, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  const addHistoricalMilestone = useCallback(
    (milestoneData: Omit<HistoricalMilestone, "id">) => {
      const newMilestone: HistoricalMilestone = {
        ...milestoneData,
        id: "hist-" + Date.now(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORICAL) || "[]");
      const updated = [newMilestone, ...current];
      localStorage.setItem(STORAGE_KEYS.HISTORICAL, JSON.stringify(updated));
      triggerStoreUpdate();
      return newMilestone;
    },
    []
  );

  const deleteHistoricalMilestone = useCallback((id: string) => {
    const current: HistoricalMilestone[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORICAL) || "[]");
    const updated = current.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.HISTORICAL, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  // --- PEOPLE ---
  const addPerson = useCallback(
    (personData: Omit<Person, "id" | "createdAt">) => {
      const newPerson: Person = {
        ...personData,
        id: "person-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.PEOPLE) || "[]");
      const updated = [newPerson, ...current];
      localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(updated));
      triggerStoreUpdate();
      return newPerson;
    },
    []
  );

  const updatePerson = useCallback((id: string, updates: Partial<Person>) => {
    const current: Person[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PEOPLE) || "[]");
    const updated = current.map((p) => (p.id === id ? { ...p, ...updates } : p));
    localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deletePerson = useCallback(
    (id: string) => {
      const current: Person[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PEOPLE) || "[]");
      const target = current.find((p) => p.id === id);
      if (target) {
        moveToTrash("pessoa", target.id, target.name, target);
      }
      const updated = current.filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- LABS & GRAVEYARD ---
  const addLabItem = useCallback(
    (labData: Omit<LabItem, "id" | "createdAt" | "updatedAt">) => {
      const newItem: LabItem = {
        ...labData,
        id: "lab-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.LABS) || "[]");
      const updated = [newItem, ...current];
      localStorage.setItem(STORAGE_KEYS.LABS, JSON.stringify(updated));
      logActivity("criou", "ideia", newItem.id, newItem.title);
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
    (id: string) => {
      const current: LabItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LABS) || "[]");
      const target = current.find((item) => item.id === id);
      if (target) {
        moveToTrash("ideia", target.id, target.title, target);
      }
      const updated = current.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEYS.LABS, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  const promoteLabToProject = useCallback(
    (labId: string) => {
      const labs: LabItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LABS) || "[]");
      const target = labs.find((l) => l.id === labId);
      if (!target) return null;

      const newProj = addProject({
        title: target.title,
        description: `${target.description}${target.hypothesis ? `\n\nHipótese Inicial: ${target.hypothesis}` : ""}`,
        category: target.category,
        status: "ativo",
        priority: "alta",
        tags: [...target.tags, "promovido-do-labs"],
        progress: 10,
      });

      if (target.notes) {
        addNote({
          projectId: newProj.id,
          title: `Notas de Incubação (Labs) — ${target.title}`,
          content: target.notes,
          tags: ["labs", "historico"],
          pinned: true,
        });
      }

      updateLabItem(labId, { stage: "promovido", promotedProjectId: newProj.id });
      logActivity("criou", "projeto", newProj.id, `Promoveu "${target.title}" para Projeto`);
      return newProj;
    },
    [addProject, addNote, updateLabItem, logActivity]
  );

  const addGraveyardItem = useCallback(
    (graveData: Omit<GraveyardItem, "id" | "createdAt">) => {
      const newItem: GraveyardItem = {
        ...graveData,
        id: "grave-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRAVEYARD) || "[]");
      const updated = [newItem, ...current];
      localStorage.setItem(STORAGE_KEYS.GRAVEYARD, JSON.stringify(updated));
      logActivity("arquivou", "projeto", newItem.id, newItem.title);
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
    (thesisData: Omit<ArgumentThesis, "id" | "createdAt" | "updatedAt">) => {
      const newThesis: ArgumentThesis = {
        ...thesisData,
        id: "thesis-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.THESES) || "[]");
      const updated = [newThesis, ...current];
      localStorage.setItem(STORAGE_KEYS.THESES, JSON.stringify(updated));
      logActivity("criou", "referencia", newThesis.id, newThesis.title);
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
    (id: string) => {
      const current: ArgumentThesis[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.THESES) || "[]");
      const target = current.find((t) => t.id === id);
      if (target) {
        moveToTrash("tese", target.id, target.title, target);
      }
      const updated = current.filter((t) => t.id !== id);
      localStorage.setItem(STORAGE_KEYS.THESES, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- RESEARCH ---
  const addResearch = useCallback(
    (resData: Omit<AcademicResearch, "id" | "createdAt">) => {
      const newRes: AcademicResearch = {
        ...resData,
        id: "res-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESEARCHES) || "[]");
      const updated = [newRes, ...current];
      localStorage.setItem(STORAGE_KEYS.RESEARCHES, JSON.stringify(updated));
      logActivity("criou", "pesquisa", newRes.id, newRes.title);
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
    (id: string) => {
      const current: AcademicResearch[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESEARCHES) || "[]");
      const target = current.find((r) => r.id === id);
      if (target) {
        moveToTrash("evidencia", target.id, target.title, target);
      }
      const updated = current.filter((r) => r.id !== id);
      localStorage.setItem(STORAGE_KEYS.RESEARCHES, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  const addEvidence = useCallback(
    (eviData: Omit<EvidenceItem, "id" | "createdAt">) => {
      const newEvi: EvidenceItem = {
        ...eviData,
        id: "evi-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVIDENCES) || "[]");
      const updated = [newEvi, ...current];
      localStorage.setItem(STORAGE_KEYS.EVIDENCES, JSON.stringify(updated));
      logActivity("criou", "referencia", newEvi.id, newEvi.claim);
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
    (id: string) => {
      const current: EvidenceItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVIDENCES) || "[]");
      const target = current.find((e) => e.id === id);
      if (target) {
        moveToTrash("evidencia", target.id, target.claim, target);
      }
      const updated = current.filter((e) => e.id !== id);
      localStorage.setItem(STORAGE_KEYS.EVIDENCES, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- OPPORTUNITIES ---
  const addOpportunity = useCallback(
    (oppData: Omit<Opportunity, "id" | "createdAt" | "updatedAt">) => {
      const newOpp: Opportunity = {
        ...oppData,
        id: "opp-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES) || "[]");
      const updated = [newOpp, ...current];
      localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(updated));
      logActivity("criou", "projeto", newOpp.id, newOpp.title);
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
    (id: string) => {
      const current: Opportunity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES) || "[]");
      const target = current.find((o) => o.id === id);
      if (target) {
        moveToTrash("edital", target.id, target.title, target);
      }
      const updated = current.filter((o) => o.id !== id);
      localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- FORGE STUDIO ---
  const addForgeFile = useCallback(
    (fileData: Omit<ForgeFile, "id" | "createdAt" | "updatedAt">) => {
      const newFile: ForgeFile = {
        ...fileData,
        id: "forge-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORGE) || "[]");
      const updated = [newFile, ...current];
      localStorage.setItem(STORAGE_KEYS.FORGE, JSON.stringify(updated));
      logActivity("criou", "codigo", newFile.id, newFile.name);
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
    (id: string) => {
      const current: ForgeFile[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORGE) || "[]");
      const target = current.find((f) => f.id === id);
      if (target) {
        moveToTrash("codigo", target.id, target.name, target);
      }
      const updated = current.filter((f) => f.id !== id);
      localStorage.setItem(STORAGE_KEYS.FORGE, JSON.stringify(updated));
      triggerStoreUpdate();
    },
    [moveToTrash]
  );

  // --- REFERENCES & TIMELINE ---
  const addReference = useCallback(
    (refData: Omit<ProjectReference, "id" | "createdAt">) => {
      const newRef: ProjectReference = {
        ...refData,
        id: "ref-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.REFERENCES) || "[]");
      const updated = [newRef, ...current];
      localStorage.setItem(STORAGE_KEYS.REFERENCES, JSON.stringify(updated));
      logActivity("criou", "referencia", newRef.id, newRef.title, newRef.projectId);
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

  const addTimelineEvent = useCallback((eventData: Omit<ProjectTimelineEvent, "id">) => {
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
    logActivity,
  };
}
