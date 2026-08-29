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
  LegalSubject,
  EvidenceItem,
  AcademicResearch,
  Opportunity,
  OpportunityStatus,
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
  INITIALIZED: "varynth_os_initialized_v3",
};

// --- SEED DATA FASE 3 ---
const SEED_THESES: ArgumentThesis[] = [
  {
    id: "thesis-1",
    title: "Personalidade Jurídica Eletrônica para Agentes de IA Autônomos",
    area: "Direito Digital & Civil",
    question: "É viável e necessária a atribuição de uma categoria de personalidade jurídica intermediária (tertium genus) para modelos de IA autônomos com patrimônio segregado?",
    pros: [
      { id: "p1", statement: "Garante um fundo de garantia patrimonial autônomo para indenização de danos decorrentes de decisões algorítmicas opacas (black box)." },
      { id: "p2", statement: "Evita a estagnação da inovação tecnológica ao delimitar os limites de responsabilidade dos desenvolvedores originais." },
    ],
    cons: [
      { id: "c1", statement: "Pode ser utilizada como 'escudo corporativo' (corporate veil) para blindar grandes conglomerados de tecnologia contra responsabilidade civil objetiva." },
      { id: "c2", statement: "A teoria subjetiva tradicional do Direito exige volição moral e consciência, elementos inexistentes em modelos estatísticos preditivos." },
    ],
    precedents: [
      "STJ — REsp 1.798.892 (Responsabilidade objetiva por fato do produto em plataformas digitais)",
      "STF — ADC 51 (Acesso a dados telemáticos e soberania jurisdicional)",
    ],
    doctrine: [
      "Pontes de Miranda: Teoria do Fato Jurídico e Sujeito de Direito",
      "Gunther Teubner: 'Digital Personhood and Algorithmic Subjects'",
      "Bruno Miragem: Direito das Novas Tecnologias e Proteção do Consumidor",
    ],
    counterArguments: [
      "A responsabilidade objetiva da cadeia de fornecedores (Art. 14 do CDC e Art. 927 do CC) já é suficiente para proteger a vítima sem a necessidade de criar ficções de personalidade.",
    ],
    conclusion: "A curto prazo, a aplicação robusta da responsabilidade civil objetiva com inversão do ônus da prova e seguros obrigatórios é mais eficiente do que a concessão de personalidade eletrônica plena.",
    tags: ["ia", "responsabilidade-civil", "personalidade-eletronica", "direito-digital"],
    status: "consolidada",
    createdAt: "2026-08-22T10:00:00.000Z",
    updatedAt: "2026-08-28T16:00:00.000Z",
  },
];

const SEED_RESEARCHES: AcademicResearch[] = [
  {
    id: "research-1",
    title: "Autonomia Decisória em Agentes de IA: Análise da Teoria do Risco Integral",
    problem: "Em que medida a autonomia decisória de agentes baseados em LLMs desafia a clássica causalidade direta no direito da responsabilidade civil?",
    hypothesis: "A opacidade inerente às redes neurais profundas rompe a previsibilidade clássica, demandando um modelo de imputação de risco por atividade perigosa.",
    objectives: [
      "Mapear os julgados recentes do STJ sobre responsabilidade por algoritmos.",
      "Analisar o AI Act europeu e as propostas do marco regulatório brasileiro (PL 2338/2023).",
      "Propor diretrizes para a distribuição do ônus probatório em perícias algorítmicas.",
    ],
    methodology: "Pesquisa qualitativa, bibliográfica e documental, com análise comparada entre a jurisprudência nacional e as diretrizes do AI Act.",
    targetVenue: "Revista Brasileira de Direito e Tecnologia (Qualis A1)",
    submissionDeadline: "2026-11-30",
    status: "escrita",
    projectId: "proj-pesquisa-ia",
    tags: ["ia", "responsabilidade", "artigo-a1", "metodologia"],
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
    quote: "When algorithms are shielded by trade secrecy and mathematical complexity, the injured party is structurally incapable of proving technical negligence without state-mandated auditability.",
    strength: "forte",
    section: "discussao",
    tags: ["black-box", "assimetria", "auditoria"],
    createdAt: "2026-08-25T11:00:00.000Z",
  },
  {
    id: "evi-2",
    researchId: "research-1",
    claim: "O PL 2338/2023 adota a gradação de risco similar ao AI Act europeu para sistemas de alto risco.",
    source: "Senado Federal — Relatório da Comissão de Juristas (2024)",
    page: "Art. 14 a 18",
    quote: "Consideram-se de alto risco as aplicações de inteligência artificial utilizadas para decisões com efeitos jurídicos relevantes sobre pessoas naturais.",
    strength: "forte",
    section: "metodologia",
    tags: ["legislacao", "pl2338", "alto-risco"],
    createdAt: "2026-08-26T14:00:00.000Z",
  },
  {
    id: "evi-3",
    researchId: "research-1",
    claim: "A simples explicabilidade pós-fato (post-hoc XAI) não garante segurança jurídica determinística.",
    source: "Lipton, Z. C. The Mythos of Model Interpretability (2018)",
    page: "p. 36",
    quote: "Linear approximations of nonlinear high-dimensional models often produce plausible explanations that are fundamentally unfaithful to the actual model mechanics.",
    strength: "moderada",
    section: "revisao_literatura",
    tags: ["xai", "explicabilidade", "epistemologia"],
    createdAt: "2026-08-28T09:30:00.000Z",
  },
];

const SEED_OPPORTUNITIES: Opportunity[] = [
  {
    id: "opp-1",
    title: "Edital de Iniciação Científica & Inovação Tecnológica (PIBIC)",
    institution: "CNPq / Universidade",
    deadline: "2026-09-25",
    prizeOrGrant: "Bolsa Mensal R$ 700 / 12 meses",
    url: "https://cnpq.br/editais",
    requirements: [
      "Aluno regularmente matriculado",
      "Orientador com titulação de Doutor",
      "Plano de trabalho estruturado de 20h semanais",
    ],
    requiredDocs: [
      "Histórico Escolar Atualizado",
      "Currículo Lattes do orientador e bolsista",
      "Projeto de Pesquisa com cronograma",
    ],
    relatedProjectId: "proj-pesquisa-ia",
    status: "preparando",
    notes: "Falta anexar o parecer de aprovação do comitê de ética e a assinatura do Dr. Roberto.",
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-28T18:00:00.000Z",
  },
  {
    id: "opp-2",
    title: "Prêmio Jovem Jurista — Inovação & Direito Digital 2026",
    institution: "Instituto Brasileiro de Direito e Tecnologia (IBDT)",
    deadline: "2026-10-31",
    prizeOrGrant: "R$ 10.000 + Publicação em Livro Coletivo",
    url: "https://ibdt.org.br/premio-2026",
    requirements: [
      "Artigo inédito entre 15 e 25 páginas",
      "Formatação segundo normas ABNT",
      "Temática voltada a Direito e Novas Tecnologias",
    ],
    requiredDocs: [
      "Termo de Cessão de Direitos",
      "Arquivo do Artigo anonimizado (Double Blind Review)",
    ],
    relatedProjectId: "proj-pesquisa-ia",
    status: "analisando",
    notes: "O artigo da pesquisa sobre IA se encaixa perfeitamente no escopo da chamada.",
    createdAt: "2026-08-27T15:00:00.000Z",
    updatedAt: "2026-08-28T12:00:00.000Z",
  },
  {
    id: "opp-3",
    title: "Hackathon Nacional de LegalTech & Inovação Pública",
    institution: "Conselho Nacional de Justiça (CNJ)",
    deadline: "2026-11-15",
    prizeOrGrant: "R$ 30.000 para os 3 primeiros colocados",
    url: "https://cnj.jus.br/hackathon",
    requirements: [
      "Equipe de 2 a 5 participantes",
      "Protótipo funcional de software ou assistente de IA",
    ],
    requiredDocs: [
      "Repositório GitHub do projeto",
      "Vídeo pitch de demonstração de 3 minutos",
    ],
    relatedProjectId: "proj-varynth",
    status: "interessado",
    notes: "Podemos submeter a arquitetura da Athena integrada ao Codex.",
    createdAt: "2026-08-29T09:00:00.000Z",
    updatedAt: "2026-08-29T09:00:00.000Z",
  },
];

const STORE_UPDATE_EVENT = "varynth_store_update";

function triggerStoreUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORE_UPDATE_EVENT));
  }
}

export function useVarynthStore() {
  // Existing states
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

  // Phase 3 states
  const [theses, setTheses] = useState<ArgumentThesis[]>([]);
  const [researches, setResearches] = useState<AcademicResearch[]>([]);
  const [evidences, setEvidences] = useState<EvidenceItem[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  const [isLoaded, setIsLoaded] = useState(false);

  const loadData = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!initialized) {
        localStorage.setItem(STORAGE_KEYS.THESES, JSON.stringify(SEED_THESES));
        localStorage.setItem(STORAGE_KEYS.RESEARCHES, JSON.stringify(SEED_RESEARCHES));
        localStorage.setItem(STORAGE_KEYS.EVIDENCES, JSON.stringify(SEED_EVIDENCES));
        localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(SEED_OPPORTUNITIES));
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

      setTheses(JSON.parse(localStorage.getItem(STORAGE_KEYS.THESES) || "[]"));
      setResearches(JSON.parse(localStorage.getItem(STORAGE_KEYS.RESEARCHES) || "[]"));
      setEvidences(JSON.parse(localStorage.getItem(STORAGE_KEYS.EVIDENCES) || "[]"));
      setOpportunities(JSON.parse(localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES) || "[]"));
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

  // Log activity helper
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

  // --- CODEX & ARGUMENT ARENA (FASE 3) ---
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

  // --- RESEARCH & EVIDENCE BOARD (FASE 3) ---
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

  // --- OPPORTUNITIES (FASE 3) ---
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
    addReference,
    deleteReference,
    addTimelineEvent,
    deleteTimelineEvent,
    logActivity,
  };
}
