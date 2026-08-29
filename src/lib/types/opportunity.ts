export type OpportunityStatus =
  | "interessado"
  | "analisando"
  | "preparando"
  | "submetido"
  | "aprovado"
  | "rejeitado"
  | "encerrado";

export interface Opportunity {
  id: string;
  title: string;
  institution: string; // Ex: FAPESP, CNPq, Universidade, Instituto
  deadline: string; // YYYY-MM-DD
  prizeOrGrant?: string; // Ex: "R$ 15.000 / Bolsa R$ 700/mês"
  url?: string;
  editalUrl?: string;
  requirements: string[]; // Requisitos de elegibilidade
  requiredDocs: string[]; // Documentos necessários
  relatedProjectId?: string;
  status: OpportunityStatus;
  notes?: string;
  result?: string;
  createdAt: string;
  updatedAt: string;
}
