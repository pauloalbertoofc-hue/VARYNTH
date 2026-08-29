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
  INITIALIZED: "varynth_os_initialized_v2",
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
    progress: 55,
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
    collaborators: ["Paulo", "Dr. Roberto Silva"],
    progress: 35,
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
    collaborators: ["Paulo", "Mariana Costa"],
    progress: 80,
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-08-27T16:00:00.000Z",
  },
];

const SEED_TASKS: Task[] = [
  {
    id: "task-1",
    projectId: "proj-varynth",
    title: "Estruturar System Apps: Vault, Chronos, People e Labs",
    description: "Implementar segundo cérebro, gestão temporal e incubadora de ideias.",
    status: "em_progresso",
    priority: "urgente",
    dueDate: "2026-08-30",
    tags: ["system-apps", "fase-2"],
    createdAt: "2026-08-29T08:00:00.000Z",
  },
  {
    id: "task-2",
    projectId: "proj-pesquisa-ia",
    title: "Catalogar 5 evidências doutrinárias no Evidence Board",
    description: "Separar argumentos a favor e contra para a seção metodológica do trabalho.",
    status: "a_fazer",
    priority: "alta",
    dueDate: "2026-09-05",
    tags: ["leitura", "fichamento"],
    createdAt: "2026-08-26T11:00:00.000Z",
  },
  {
    id: "task-3",
    projectId: "proj-ligahub",
    title: "Exportar relatório de frequência para certificação de membros",
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

const SEED_VAULT: VaultItem[] = [
  {
    id: "vault-1",
    title: "Autonomous Agents & Epistemic Decision Trees",
    type: "artigo",
    author: "Russell, S. & Norvig, P. (2025)",
    source: "arXiv:2501.12345",
    url: "https://arxiv.org",
    tags: ["ia", "agentes", "epistemologia", "decisao"],
    category: "Inteligência Artificial",
    relatedProjectIds: ["proj-pesquisa-ia", "proj-varynth"],
    readingStatus: "lendo",
    notes: "O capítulo 3 aborda o trade-off entre autonomia algorítmica e controle humano determinístico.",
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-28T14:00:00.000Z",
  },
  {
    id: "vault-2",
    title: "Súmula Vinculante 10 — Reserva de Plenário e Controle Difuso",
    type: "jurisprudencia",
    author: "Supremo Tribunal Federal",
    source: "DJe 12/06/2008",
    url: "https://portal.stf.jus.br",
    tags: ["stf", "constitucional", "jurisprudencia", "reserva-plenario"],
    category: "Direito Constitucional",
    relatedProjectIds: ["proj-pesquisa-ia"],
    readingStatus: "concluido",
    notes: "Viola a cláusula de reserva de plenário a decisão de órgão fracionário que afasta a incidência de lei no todo ou em parte.",
    createdAt: "2026-08-22T16:00:00.000Z",
    updatedAt: "2026-08-22T16:00:00.000Z",
  },
  {
    id: "vault-3",
    title: "Design Systems for High-Density Web Operating Systems",
    type: "link",
    author: "Guillermo Rauch",
    source: "Blog Vercel",
    url: "https://vercel.com/blog",
    tags: ["frontend", "design-system", "cyberpunk", "ux"],
    category: "Engenharia de Software",
    relatedProjectIds: ["proj-varynth"],
    readingStatus: "concluido",
    notes: "Diretrizes para interfaces densas e responsivas sem sobrecarga cognitiva.",
    createdAt: "2026-08-28T18:00:00.000Z",
    updatedAt: "2026-08-28T18:00:00.000Z",
  },
];

const SEED_CHRONOS: ChronosEvent[] = [
  {
    id: "chronos-1",
    title: "Entrega do Relatório Final da LigaHub",
    date: "2026-09-20",
    startTime: "18:00",
    type: "prazo",
    projectId: "proj-ligahub",
    completed: false,
    notes: "Submissão no portal da coordenação acadêmica.",
    createdAt: "2026-08-28T10:00:00.000Z",
  },
  {
    id: "chronos-2",
    title: "Reunião de Orientação de Pesquisa",
    date: "2026-09-02",
    startTime: "14:30",
    endTime: "16:00",
    type: "reuniao",
    projectId: "proj-pesquisa-ia",
    completed: false,
    notes: "Apresentar fichamentos e estrutura do Evidence Board ao Dr. Roberto.",
    createdAt: "2026-08-28T11:00:00.000Z",
  },
  {
    id: "chronos-3",
    title: "Sprint de Desenvolvimento: VARYNTH Fase 2",
    date: "2026-08-29",
    type: "rotina",
    projectId: "proj-varynth",
    completed: true,
    notes: "Finalização dos System Apps (Vault, Chronos, People, Labs).",
    createdAt: "2026-08-29T08:00:00.000Z",
  },
];

const SEED_HISTORICAL: HistoricalMilestone[] = [
  {
    id: "hist-1",
    period: "Agosto 2026",
    title: "Nascimento do VARYNTH OS",
    description: "Criação do repositório, arquitetura modular em 3 camadas e deploy de estreia na Vercel.",
    category: "sistema",
    badge: "Gênese",
    date: "2026-08-28",
  },
  {
    id: "hist-2",
    period: "Agosto 2026",
    title: "Athena Copilot Contextual v0.1",
    description: "Primeira versão integrada à workspace de projetos com prompts de diagnóstico.",
    category: "athena",
    badge: "IA",
    date: "2026-08-29",
  },
  {
    id: "hist-3",
    period: "Julho 2026",
    title: "Lançamento do LigaHub v1.0",
    description: "Início das operações de controle de membros e presença por QR Code na Liga Acadêmica.",
    category: "projeto",
    badge: "Produção",
    date: "2026-07-10",
  },
];

const SEED_PEOPLE: Person[] = [
  {
    id: "person-1",
    name: "Dr. Roberto Silva",
    role: "Professor / Orientador",
    organization: "Faculdade de Direito & Tecnologia",
    email: "roberto.silva@universidade.edu.br",
    tags: ["orientador", "direito-digital", "ia"],
    notes: "Especialista em responsabilidade civil algorítmica e hermenêutica.",
    projectPermissions: [
      { projectId: "proj-pesquisa-ia", level: "administrar" },
    ],
    createdAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "person-2",
    name: "Mariana Costa",
    role: "Diretora Acadêmica",
    organization: "Liga Acadêmica",
    email: "mariana.costa@ligahub.org",
    tags: ["gestao", "eventos", "academico"],
    notes: "Responsável pelo cronograma de aulas magnas e emissão de certificados.",
    projectPermissions: [
      { projectId: "proj-ligahub", level: "editar" },
    ],
    createdAt: "2026-07-12T14:00:00.000Z",
  },
  {
    id: "person-3",
    name: "Lucas Mendes",
    role: "Pesquisador Colaborador",
    organization: "Lab de Inovação",
    email: "lucas.m@labinov.com",
    tags: ["pesquisa", "ciencia-dados"],
    notes: "Apoio em coleta de datasets e métricas empíricas.",
    projectPermissions: [
      { projectId: "proj-pesquisa-ia", level: "comentar" },
    ],
    createdAt: "2026-08-20T09:00:00.000Z",
  },
];

const SEED_LABS: LabItem[] = [
  {
    id: "lab-1",
    title: "Graph Visualizer para Conexões Epistêmicas",
    description: "Mecanismo visual em canvas/WebGL para exibir graficamente como uma tese jurídica se apoia em precedentes e doutrinas.",
    hypothesis: "A visualização espacial reduz o tempo de revisão de argumentos em 40%.",
    stage: "experimento",
    category: "software",
    tags: ["grafo", "canvas", "visualizacao", "ia"],
    notes: "Testar com a biblioteca Cytoscape.js ou Force Graph 3D.",
    createdAt: "2026-08-24T10:00:00.000Z",
    updatedAt: "2026-08-29T10:00:00.000Z",
  },
  {
    id: "lab-2",
    title: "Extrator Automático de Ementas do STF/STJ via API",
    description: "Script Python para buscar julgados e injetar automaticamente no Vault do VARYNTH.",
    hypothesis: "Automação do fichamento de informativos semanais.",
    stage: "prototipo",
    category: "pesquisa",
    tags: ["python", "scraping", "stf", "automacao"],
    notes: "Integrável à Athena como tool futura.",
    createdAt: "2026-08-21T15:00:00.000Z",
    updatedAt: "2026-08-28T11:00:00.000Z",
  },
  {
    id: "lab-3",
    title: "Voice Interface para Comandos da Athena",
    description: "Permitir ditar anotações e criar tarefas falando diretamente com o VARYNTH OS.",
    stage: "ideia",
    category: "experimento",
    tags: ["voz", "whisper", "athena"],
    createdAt: "2026-08-29T08:00:00.000Z",
    updatedAt: "2026-08-29T08:00:00.000Z",
  },
];

const SEED_GRAVEYARD: GraveyardItem[] = [
  {
    id: "grave-1",
    title: "Bot de Notícias Jurídicas no Telegram v0.1",
    originalCategory: "software",
    whyStarted: "Queria receber resumos diários dos informativos do STF no Telegram.",
    whyAbandoned: "As regras de scraping mudaram e a manutenção manual ficou inviável com as aulas.",
    lessonsLearned: "Melhor usar RSS feeds padronizados ou APIs oficiais em vez de web scraping frágil.",
    reusableAssets: "Módulo de formatação de mensagens em Markdown e parser de ementas em Python.",
    tags: ["telegram", "python", "scraping"],
    abandonedAt: "2026-05-15",
    createdAt: "2026-04-01T10:00:00.000Z",
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
    entityTitle: "Estruturar System Apps: Vault, Chronos, People e Labs",
    timestamp: "2026-08-29T10:30:00.000Z",
    user: "Paulo",
  },
];

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
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [references, setReferences] = useState<ProjectReference[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<ProjectTimelineEvent[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadData = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!initialized) {
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(SEED_PROJECTS));
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(SEED_TASKS));
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(SEED_NOTES));
        localStorage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(SEED_VAULT));
        localStorage.setItem(STORAGE_KEYS.CHRONOS, JSON.stringify(SEED_CHRONOS));
        localStorage.setItem(STORAGE_KEYS.HISTORICAL, JSON.stringify(SEED_HISTORICAL));
        localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(SEED_PEOPLE));
        localStorage.setItem(STORAGE_KEYS.LABS, JSON.stringify(SEED_LABS));
        localStorage.setItem(STORAGE_KEYS.GRAVEYARD, JSON.stringify(SEED_GRAVEYARD));
        localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(SEED_ACTIVITIES));
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, "true");
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

  // --- LOGGING ---
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
      const updated = current.filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
      if (target) {
        logActivity("removeu", "projeto", id, target.title);
      }
      triggerStoreUpdate();
    },
    [logActivity]
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
      const updated = current.filter((t) => t.id !== id);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
      if (target) {
        logActivity("removeu", "tarefa", id, target.title, target.projectId);
      }
      triggerStoreUpdate();
    },
    [logActivity]
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
      const updated = current.filter((n) => n.id !== id);
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
      if (target) {
        logActivity("removeu", "nota", id, target.title, target.projectId);
      }
      triggerStoreUpdate();
    },
    [logActivity]
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
      const updated = current.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(updated));
      if (target) {
        logActivity("removeu", "referencia", id, target.title);
      }
      triggerStoreUpdate();
    },
    [logActivity]
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

  const deleteChronosEvent = useCallback((id: string) => {
    const current: ChronosEvent[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHRONOS) || "[]");
    const updated = current.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.CHRONOS, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

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

  const deletePerson = useCallback((id: string) => {
    const current: Person[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PEOPLE) || "[]");
    const updated = current.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

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

  const deleteLabItem = useCallback((id: string) => {
    const current: LabItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LABS) || "[]");
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.LABS, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  // Promote Lab Idea directly to Project
  const promoteLabToProject = useCallback(
    (labId: string) => {
      const labs: LabItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LABS) || "[]");
      const target = labs.find((l) => l.id === labId);
      if (!target) return null;

      // 1. Create the project
      const newProj = addProject({
        title: target.title,
        description: `${target.description}${target.hypothesis ? `\n\nHipótese Inicial: ${target.hypothesis}` : ""}`,
        category: target.category,
        status: "ativo",
        priority: "alta",
        tags: [...target.tags, "promovido-do-labs"],
        progress: 10,
      });

      // 2. If lab had notes, create a starting note
      if (target.notes) {
        addNote({
          projectId: newProj.id,
          title: `Notas de Incubação (Labs) — ${target.title}`,
          content: target.notes,
          tags: ["labs", "historico"],
          pinned: true,
        });
      }

      // 3. Mark lab item as promoted
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
    addReference,
    deleteReference,
    addTimelineEvent,
    deleteTimelineEvent,
    logActivity,
  };
}
