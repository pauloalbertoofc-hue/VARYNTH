"use client";

import { useState, useEffect, useCallback } from "react";
import { Project, Task, Note, ProjectFile, ProjectReference, ProjectTimelineEvent, Activity } from "../types";

const STORAGE_KEYS = {
  PROJECTS: "varynth_os_projects",
  TASKS: "varynth_os_tasks",
  NOTES: "varynth_os_notes",
  FILES: "varynth_os_files",
  REFERENCES: "varynth_os_references",
  TIMELINE: "varynth_os_timeline",
  ACTIVITIES: "varynth_os_activities",
  INITIALIZED: "varynth_os_initialized_v1",
};

// --- INITIAL SEED DATA ---
const SEED_PROJECTS: Project[] = [
  {
    id: "proj-varynth",
    title: "VARYNTH OS — Universo Digital Pessoal",
    description: "Desenvolvimento da plataforma modular estilo sistema operacional web para centralizar projetos, estudos, pesquisas e Athena AI.",
    category: "software",
    status: "ativo",
    priority: "urgente",
    deadline: "2026-10-15",
    tags: ["nextjs", "typescript", "cyberpunk", "os-web"],
    collaborators: ["Paulo"],
    progress: 45,
    createdAt: "2026-08-28T22:00:00.000Z",
    updatedAt: "2026-08-29T10:00:00.000Z",
  },
  {
    id: "proj-pesquisa-ia",
    title: "Pesquisa: Inteligência Artificial e Autonomia Cognitiva",
    description: "Investigação acadêmica sobre o impacto de agentes autônomos na tomada de decisões complexas e hermenêutica jurídica.",
    category: "pesquisa",
    status: "ativo",
    priority: "alta",
    deadline: "2026-11-30",
    tags: ["ia", "artigo", "epistemologia", "direito"],
    collaborators: ["Paulo", "Orientador"],
    progress: 25,
    createdAt: "2026-08-15T14:30:00.000Z",
    updatedAt: "2026-08-28T18:20:00.000Z",
  },
  {
    id: "proj-ligahub",
    title: "LigaHub — Gestão Acadêmica v2",
    description: "Expansão do sistema de gestão da Liga Acadêmica com integração de QR Code para eventos e controle financeiro avançado.",
    category: "academico",
    status: "ativo",
    priority: "media",
    deadline: "2026-09-20",
    tags: ["fastapi", "sqlite", "gestao", "academia"],
    collaborators: ["Paulo", "Diretoria"],
    progress: 80,
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-08-27T16:00:00.000Z",
  },
];

const SEED_TASKS: Task[] = [
  {
    id: "task-1",
    projectId: "proj-varynth",
    title: "Estruturar workspaces de projetos com abas completas",
    description: "Implementar visão geral, tarefas, notas, arquivos, referências e Athena contextual.",
    status: "em_progresso",
    priority: "urgente",
    dueDate: "2026-08-30",
    tags: ["core", "frontend"],
    createdAt: "2026-08-29T08:00:00.000Z",
  },
  {
    id: "task-2",
    projectId: "proj-varynth",
    title: "Construir modal universal '+ Criar' na barra superior",
    description: "Permitir criar rapidamente notas, tarefas, projetos e ideias de qualquer tela.",
    status: "em_progresso",
    priority: "alta",
    dueDate: "2026-08-29",
    tags: ["ux", "modal"],
    createdAt: "2026-08-29T08:30:00.000Z",
  },
  {
    id: "task-3",
    projectId: "proj-pesquisa-ia",
    title: "Fichar 5 artigos principais sobre responsabilidade de agentes IA",
    description: "Organizar evidências e argumentos para a seção metodológica do trabalho.",
    status: "a_fazer",
    priority: "alta",
    dueDate: "2026-09-05",
    tags: ["leitura", "fichamento"],
    createdAt: "2026-08-26T11:00:00.000Z",
  },
  {
    id: "task-4",
    projectId: "proj-ligahub",
    title: "Exportar relatório de presença para certificação de membros",
    description: "Gerar planilha consolidada dos alunos aptos ao certificado semestral.",
    status: "concluida",
    priority: "media",
    dueDate: "2026-08-25",
    tags: ["relatorio", "certificados"],
    createdAt: "2026-08-20T09:00:00.000Z",
    completedAt: "2026-08-25T17:00:00.000Z",
  },
];

const SEED_NOTES: Note[] = [
  {
    id: "note-1",
    projectId: "proj-varynth",
    title: "Princípios de Design do VARYNTH OS",
    content: "O sistema deve equilibrar estética cyberpunk/gaming com usabilidade profissional impecável. Navegação por atalhos, zero fricção na captura de ideias, e modularidade em 3 camadas (Core, System Apps, Personal Apps).",
    tags: ["arquitetura", "design", "filosofia"],
    pinned: true,
    createdAt: "2026-08-28T22:30:00.000Z",
    updatedAt: "2026-08-29T09:15:00.000Z",
  },
  {
    id: "note-2",
    projectId: "proj-pesquisa-ia",
    title: "Tese Principal: Agência vs. Instrumento",
    content: "A dicotomia tradicional entre sujeito e objeto de direito falha ao categorizar sistemas generativos com alta delegação de decisão. Necessidade de uma categoria intermediária com prestação de contas transparente.",
    tags: ["tese", "pesquisa", "juridico"],
    pinned: true,
    createdAt: "2026-08-25T15:00:00.000Z",
    updatedAt: "2026-08-27T14:20:00.000Z",
  },
];

const SEED_REFERENCES: ProjectReference[] = [
  {
    id: "ref-1",
    projectId: "proj-pesquisa-ia",
    title: "Autonomous Decision Making and Legal Epistemology",
    author: "Russell & Norvig, 2024",
    url: "https://arxiv.org",
    type: "artigo",
    notes: "Capítulo 4 detalha a árvore de inferência em modelos probabilísticos.",
    createdAt: "2026-08-26T10:00:00.000Z",
  },
  {
    id: "ref-2",
    projectId: "proj-varynth",
    title: "Next.js 16 App Router & Server Actions Architecture",
    author: "Vercel Docs",
    url: "https://nextjs.org/docs",
    type: "site",
    notes: "Referência fundamental para a estrutura de rotas do OS.",
    createdAt: "2026-08-28T20:00:00.000Z",
  },
];

const SEED_TIMELINE: ProjectTimelineEvent[] = [
  {
    id: "time-1",
    projectId: "proj-varynth",
    title: "Concepção do VARYNTH OS",
    description: "Definição do nome, design system cyberpunk e deploy inicial na Vercel.",
    date: "2026-08-28",
    type: "criacao",
  },
  {
    id: "time-2",
    projectId: "proj-varynth",
    title: "Fase 1: Workspaces de Projetos e Cockpit",
    description: "Implementação do modelo de dados unificado, botão + Criar e abas operacionais.",
    date: "2026-08-29",
    type: "marco",
  },
];

const SEED_ACTIVITIES: Activity[] = [
  {
    id: "act-1",
    action: "criou",
    entityType: "projeto",
    entityId: "proj-varynth",
    entityTitle: "VARYNTH OS — Universo Digital Pessoal",
    timestamp: "2026-08-29T10:00:00.000Z",
    user: "Paulo",
  },
  {
    id: "act-2",
    action: "atualizou",
    entityType: "tarefa",
    entityId: "task-1",
    entityTitle: "Estruturar workspaces de projetos com abas completas",
    timestamp: "2026-08-29T10:30:00.000Z",
    user: "Paulo",
  },
  {
    id: "act-3",
    action: "concluiu",
    entityType: "tarefa",
    entityId: "task-4",
    entityTitle: "Exportar relatório de presença para certificação de membros",
    timestamp: "2026-08-25T17:00:00.000Z",
    user: "Paulo",
  },
];

// Custom Event for cross-component reactivity
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
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [references, setReferences] = useState<ProjectReference[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<ProjectTimelineEvent[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadData = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      // Check if initialized
      const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!initialized) {
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(SEED_PROJECTS));
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(SEED_TASKS));
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(SEED_NOTES));
        localStorage.setItem(STORAGE_KEYS.REFERENCES, JSON.stringify(SEED_REFERENCES));
        localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(SEED_TIMELINE));
        localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(SEED_ACTIVITIES));
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, "true");
      }

      setProjects(JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || "[]"));
      setTasks(JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]"));
      setNotes(JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]"));
      setFiles(JSON.parse(localStorage.getItem(STORAGE_KEYS.FILES) || "[]"));
      setReferences(JSON.parse(localStorage.getItem(STORAGE_KEYS.REFERENCES) || "[]"));
      setTimelineEvents(JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMELINE) || "[]"));
      setActivities(JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || "[]"));
    } catch {
      // Fallback
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

  // --- ACTIONS ---

  const logActivity = useCallback((action: Activity["action"], entityType: Activity["entityType"], entityId: string, entityTitle: string, projectId?: string) => {
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
      const updated = [newActivity, ...current].slice(0, 50);
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
      triggerStoreUpdate();
    } catch {
      // ignore
    }
  }, []);

  // Projects
  const addProject = useCallback((projectData: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
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
  }, [logActivity]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
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
  }, [logActivity]);

  const deleteProject = useCallback((id: string) => {
    const current: Project[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || "[]");
    const target = current.find((p) => p.id === id);
    const updated = current.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
    if (target) {
      logActivity("removeu", "projeto", id, target.title);
    }
    triggerStoreUpdate();
  }, [logActivity]);

  // Tasks
  const addTask = useCallback((taskData: Omit<Task, "id" | "createdAt">) => {
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
  }, [logActivity]);

  const toggleTask = useCallback((id: string) => {
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
      logActivity(target.status === "concluida" ? "concluiu" : "atualizou", "tarefa", id, target.title, target.projectId);
    }
    triggerStoreUpdate();
  }, [logActivity]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    const current: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
    const updated = current.map((t) => (t.id === id ? { ...t, ...updates } : t));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deleteTask = useCallback((id: string) => {
    const current: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
    const target = current.find((t) => t.id === id);
    const updated = current.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
    if (target) {
      logActivity("removeu", "tarefa", id, target.title, target.projectId);
    }
    triggerStoreUpdate();
  }, [logActivity]);

  // Notes
  const addNote = useCallback((noteData: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
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
  }, [logActivity]);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    const current: Note[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
    const updated = current.map((n) =>
      n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
    );
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  const deleteNote = useCallback((id: string) => {
    const current: Note[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
    const target = current.find((n) => n.id === id);
    const updated = current.filter((n) => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
    if (target) {
      logActivity("removeu", "nota", id, target.title, target.projectId);
    }
    triggerStoreUpdate();
  }, [logActivity]);

  // References
  const addReference = useCallback((refData: Omit<ProjectReference, "id" | "createdAt">) => {
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
  }, [logActivity]);

  const deleteReference = useCallback((id: string) => {
    const current: ProjectReference[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.REFERENCES) || "[]");
    const updated = current.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REFERENCES, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  // Timeline
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
    files,
    references,
    timelineEvents,
    activities,
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
    addReference,
    deleteReference,
    addTimelineEvent,
    deleteTimelineEvent,
    logActivity,
  };
}

