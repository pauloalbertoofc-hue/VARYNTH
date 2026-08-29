export interface ArgumentPoint {
  id: string;
  statement: string;
  foundation?: string; // Lei, Artigo, Precedente
}

export type ThesisStatus = "em_elaboracao" | "consolidada" | "revisada";

export interface ArgumentThesis {
  id: string;
  title: string;
  area: string; // Ex: Direito Digital, Direito Constitucional
  question: string; // Questão jurídica controversa
  pros: ArgumentPoint[]; // Argumentos a favor
  cons: ArgumentPoint[]; // Argumentos contra
  precedents: string[]; // Súmulas, Acórdãos (STF/STJ)
  doctrine: string[]; // Citações doutrinárias
  counterArguments: string[]; // Refutações
  conclusion: string; // Síntese hermenêutica pessoal
  tags: string[];
  status: ThesisStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LegalSubject {
  id: string;
  name: string;
  code?: string;
  professor?: string;
  semester: string;
  topicsCount: number;
  tags: string[];
}

