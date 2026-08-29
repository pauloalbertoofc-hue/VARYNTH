# Opportunities — Radar de Editais, Bolsas & Chamadas Públicas

## 1. Visão Geral
O módulo de **Opportunities** (`/modules/opportunities`) monitora editais de fomento à pesquisa, bolsas acadêmicas, chamadas de artigos e prêmios de inovação, calculando a aderência temática aos projetos ativos no VARYNTH OS.

---

## 2. Estrutura de Dados (`Opportunity`)

```ts
export type OpportunityType = "edital_pesquisa" | "bolsa" | "premio" | "call_for_papers" | "financiamento" | "outro";

export interface Opportunity {
  id: string;
  title: string;
  type: OpportunityType;
  entity: string;
  deadline: string;
  amount?: string;
  matchScore?: number; // 0 - 100% de aderência aos projetos
  requirementsSummary: string;
  status: "aberta" | "em_preparacao" | "submetida" | "encerrada";
  targetProjectId?: string;
  link?: string;
}
```

