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
  INITIALIZED: "varynth_os_initialized_v5",
};

// --- INITIAL SEED FORGE FILES ---
const SEED_FORGE_FILES: ForgeFile[] = [
  {
    id: "forge-1",
    name: "token_cost_estimator.ts",
    language: "typescript",
    projectId: "proj-varynth",
    content: `// VARYNTH OS — Token & Cost Estimator for LLMs
interface ModelCost {
  inputPer1k: number;
  outputPer1k: number;
}

const PRICING: Record<string, ModelCost> = {
  "gemini-2.5-pro": { inputPer1k: 0.00125, outputPer1k: 0.005 },
  "gemini-2.5-flash": { inputPer1k: 0.000075, outputPer1k: 0.0003 },
  "claude-3-7-sonnet": { inputPer1k: 0.003, outputPer1k: 0.015 }
};

function calculateCost(model: string, inputTokens: number, outputTokens: number) {
  const price = PRICING[model];
  if (!price) return "Modelo desconhecido";

  const inCost = (inputTokens / 1000) * price.inputPer1k;
  const outCost = (outputTokens / 1000) * price.outputPer1k;
  const total = inCost + outCost;

  console.log(\`[SIMULAÇÃO] Modelo: \${model}\`);
  console.log(\`• Input (\${inputTokens} tokens): $\${inCost.toFixed(6)}\`);
  console.log(\`• Output (\${outputTokens} tokens): $\${outCost.toFixed(6)}\`);
  console.log(\`• TOTAL ESTIMADO: $\${total.toFixed(6)}\`);

  return { model, totalCostUSD: total };
}

calculateCost("gemini-2.5-flash", 14500, 1200);
`,
    createdAt: "2026-08-28T12:00:00.000Z",
    updatedAt: "2026-08-29T10:00:00.000Z",
  },
  {
    id: "forge-2",
    name: "stf_jurisprudence_parser.py",
    language: "python",
    projectId: "proj-pesquisa-ia",
    content: `# Script LegalTech para Análise de Informativos
import re
import json

raw_decision = """
REsp 1.798.892/SP. Rel. Min. Nancy Andrighi.
DIREITO DO CONSUMIDOR E TECNOLOGIA. RESPONSABILIDADE CIVIL OBJETIVA.
FALHA NA PRESTAÇÃO DE SERVIÇOS ALGORÍTMICOS. TEORIA DO RISCO DA ATIVIDADE.
Decisão: Recurso Especial conhecido e provido para fixar indenização.
"""

def extract_metadata(text):
    case_match = re.search(r'(REsp|ADI|ADC|HC)\\s*([0-9.]+)', text)
    keywords = ["RESPONSABILIDADE CIVIL", "ALGORÍTMICOS", "RISCO"]
    
    found_keywords = [k for k in keywords if k in text.upper()]
    
    result = {
        "identificador": case_match.group(0) if case_match else "N/A",
        "tags_relevantes": found_keywords,
        "impacto": "Alto para pesquisa de IA"
    }
    
    print("=== METADADOS EXTRAÍDOS ===")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result

extract_metadata(raw_decision)
`,
    createdAt: "2026-08-27T15:00:00.000Z",
    updatedAt: "2026-08-28T18:00:00.000Z",
  },
  {
    id: "forge-3",
    name: "varynth_schema.sql",
    language: "sql",
    projectId: "proj-varynth",
    content: `-- VARYNTH OS Relational Database Blueprint
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'media',
    status VARCHAR(30) DEFAULT 'ativo',
    deadline DATE,
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence_board (
    id VARCHAR(64) PRIMARY KEY,
    research_id VARCHAR(64) REFERENCES projects(id),
    claim TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    quote TEXT NOT NULL,
    strength VARCHAR(30) DEFAULT 'forte',
    section VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de busca de alta velocidade
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_evidence_strength ON evidence_board(strength);
`,
    createdAt: "2026-08-28T19:00:00.000Z",
    updatedAt: "2026-08-28T19:00:00.000Z",
  },
];

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
    progress: 75,
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
    progress: 45,
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
    title: "Construir Forge Studio e integrador de código",
    description: "IDE web com abas, runner e templates de automação.",
    status: "em_progresso",
    priority: "urgente",
    dueDate: "2026-08-30",
    tags: ["forge", "fase-5"],
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
];

const SEED_LABS: LabItem[] = [
  {
    id: "lab-1",
    title: "Graph Visualizer para Conexões Epistêmicas",
    description: "Mecanismo visual em canvas/WebGL para exibir graficamente como uma tese jurídica se apoia em precedentes e doutrinas.",
    stage: "experimento",
    category: "software",
    tags: ["grafo", "canvas", "visualizacao", "ia"],
    createdAt: "2026-08-24T10:00:00.000Z",
    updatedAt: "2026-08-29T10:00:00.000Z",
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

const SEED_THESES: ArgumentThesis[] = [
  {
    id: "thesis-1",
    title: "Personalidade Jurídica Eletrônica para Agentes de IA Autônomos",
    area: "Direito Digital & Civil",
    question: "É viável e necessária a atribuição de uma categoria de personalidade jurídica intermediária para modelos de IA autônomos?",
    pros: [
      { id: "p1", statement: "Garante um fundo de garantia patrimonial autônomo para indenização de danos decorrentes de decisões algorítmicas opacas." },
    ],
    cons: [
      { id: "c1", statement: "Pode ser utilizada como escudo corporativo para blindar conglomerados contra responsabilidade objetiva." },
    ],
    precedents: [
      "STJ — REsp 1.798.892 (Responsabilidade objetiva por fato do produto em plataformas digitais)",
    ],
    doctrine: [
      "Pontes de Miranda: Teoria do Fato Jurídico e Sujeito de Direito",
    ],
    counterArguments: [],
    conclusion: "A curto prazo, a aplicação robusta da responsabilidade civil objetiva com inversão do ônus da prova é mais eficiente.",
    tags: ["ia", "responsabilidade-civil", "direito-digital"],
    status: "consolidada",
    createdAt: "2026-08-22T10:00:00.000Z",
    updatedAt: "2026-08-28T16:00:00.000Z",
  },
];

const SEED_RESEARCHES: AcademicResearch[] = [
  {
    id: "research-1",
    title: "Autonomia Decisória em Agentes de IA: Análise da Teoria do Risco Integral",
    problem: "Em que medida a autonomia decisória de agentes baseados em LLMs desafia a causalidade direta na responsabilidade civil?",
    hypothesis: "A opacidade inerente às redes neurais profundas demanda um modelo de imputação de risco por atividade perigosa.",
    objectives: ["Mapear julgados do STJ", "Analisar AI Act", "Propor diretrizes probatórias"],
    methodology: "Pesquisa qualitativa e documental.",
    targetVenue: "Revista de Direito e Tecnologia (Qualis A1)",
    status: "escrita",
    projectId: "proj-pesquisa-ia",
    tags: ["ia", "responsabilidade", "artigo-a1"],
    createdAt: "2026-08-15T14:30:00.000Z",
  },
];

const SEED_EVIDENCES: EvidenceItem[] = [
  {
    id: "evi-1",
    researchId: "research-1",
    claim: "A assimetria informacional em modelos 'black box' inviabiliza a demonstração de culpa tradicional pela vítima.",
    source: "Pasquale, Frank. The Black Box Society (2015)",
    page: "p. 58-62",
    quote: "When algorithms are shielded by trade secrecy, the injured party is structurally incapable of proving technical negligence.",
    strength: "forte",
    section: "discussao",
    tags: ["black-box", "assimetria"],
    createdAt: "2026-08-25T11:00:00.000Z",
  },
];

const SEED_OPPORTUNITIES: Opportunity[] = [
  {
    id: "opp-1",
    title: "Edital de Iniciação Científica & Inovação Tecnológica (PIBIC)",
    institution: "CNPq / Universidade",
    deadline: "2026-09-25",
    prizeOrGrant: "Bolsa Mensal R$ 700 / 12 meses",
    requirements: ["Aluno matriculado", "Orientador Doutor"],
    requiredDocs: ["Histórico Escolar", "Lattes", "Projeto de Pesquisa"],
    relatedProjectId: "proj-pesquisa-ia",
    status: "preparando",
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-28T18:00:00.000Z",
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
  const [theses, setTheses] = useState<ArgumentThesis[]>([]);
  const [researches, setResearches] = useState<AcademicResearch[]>([]);
  const [evidences, setEvidences] = useState<EvidenceItem[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [forgeFiles, setForgeFiles] = useState<ForgeFile[]>([]);
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
        localStorage.setItem(STORAGE_KEYS.THESES, JSON.stringify(SEED_THESES));
        localStorage.setItem(STORAGE_KEYS.RESEARCHES, JSON.stringify(SEED_RESEARCHES));
        localStorage.setItem(STORAGE_KEYS.EVIDENCES, JSON.stringify(SEED_EVIDENCES));
        localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(SEED_OPPORTUNITIES));
        localStorage.setItem(STORAGE_KEYS.FORGE, JSON.stringify(SEED_FORGE_FILES));
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
      setTheses(JSON.parse(localStorage.getItem(STORAGE_KEYS.THESES) || "[]"));
      setResearches(JSON.parse(localStorage.getItem(STORAGE_KEYS.RESEARCHES) || "[]"));
      setEvidences(JSON.parse(localStorage.getItem(STORAGE_KEYS.EVIDENCES) || "[]"));
      setOpportunities(JSON.parse(localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES) || "[]"));
      setForgeFiles(JSON.parse(localStorage.getItem(STORAGE_KEYS.FORGE) || "[]"));
      setFiles(JSON.parse(localStorage.getItem(STORAGE_KEYS.FILES) || "[]"));
      setReferences(JSON.parse(localStorage.getItem(STORAGE_KEYS.REFERENCES) || "[]"));
      setTimelineEvents(JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMELINE) || "[]"));
      setActivities(JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || "[]"));
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

  const deleteThesis = useCallback((id: string) => {
    const current: ArgumentThesis[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.THESES) || "[]");
    const updated = current.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.THESES, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

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

  const deleteResearch = useCallback((id: string) => {
    const current: AcademicResearch[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESEARCHES) || "[]");
    const updated = current.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.RESEARCHES, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

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

  const deleteEvidence = useCallback((id: string) => {
    const current: EvidenceItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVIDENCES) || "[]");
    const updated = current.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EVIDENCES, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

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

  const deleteOpportunity = useCallback((id: string) => {
    const current: Opportunity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES) || "[]");
    const updated = current.filter((o) => o.id !== id);
    localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(updated));
    triggerStoreUpdate();
  }, []);

  // --- FORGE STUDIO (FASE 5) ---
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
      const updated = current.filter((f) => f.id !== id);
      localStorage.setItem(STORAGE_KEYS.FORGE, JSON.stringify(updated));
      if (target) {
        logActivity("removeu", "codigo", id, target.name);
      }
      triggerStoreUpdate();
    },
    [logActivity]
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
    logActivity,
  };
}
