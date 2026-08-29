# Research & Evidence Board — Rigor Científico & Validação Empírica

## 1. Visão Geral
O módulo de **Research** (`/modules/research`) hospeda o **Evidence Board**, permitindo catalogar alegações científicas, correlacioná-las a fontes primárias e classificar a força probatória das evidências.

---

## 2. Estrutura de Dados (`EvidenceItem`)

```ts
export type EvidenceStrength = "forte" | "moderada" | "fraca" | "inconclusiva";

export interface EvidenceItem {
  id: string;
  claim: string;
  source: string;
  sourceType: "artigo_peer_reviewed" | "pre_print" | "dados_primarios" | "relatorio_oficial" | "outro";
  strength: EvidenceStrength;
  methodologySummary?: string;
  limitations?: string;
  projectId?: string;
  tags: string[];
  createdAt: string;
}
```

---

## 3. Integração com a Athena
- O especialista científico **Logos** avalia a robustez metodológica das evidências e sugere testes cruzados.

