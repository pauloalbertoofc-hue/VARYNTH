export type ChronosEventType = "prazo" | "evento" | "rotina" | "reuniao" | "sessao_foco";

export interface ChronosEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  type: ChronosEventType;
  projectId?: string;
  completed?: boolean;
  notes?: string;
  createdAt: string;
}

export interface HistoricalMilestone {
  id: string;
  period: string; // Ex: "Agosto 2026", "Setembro 2026"
  title: string;
  description: string;
  category: "projeto" | "athena" | "pesquisa" | "conquista" | "sistema";
  badge?: string;
  date: string;
}

