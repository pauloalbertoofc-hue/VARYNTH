# Codex & Argument Arena — Dialética Jurídica & Matriz de Teses

## 1. Visão Geral
O **Codex** (`/modules/codex`) hospeda a **Argument Arena**, um ambiente desenvolvido para estruturação de controvérsias jurídicas, formulação de teses antagônicas e mapeamento de precedentes vinculantes (STF, STJ e tribunais superiores).

---

## 2. Estrutura de Dados (`ArgumentThesis`)

```ts
export interface ArgumentPoint {
  id: string;
  statement: string;
  source?: string;
  weight?: "forte" | "medio" | "fraco";
}

export interface ArgumentThesis {
  id: string;
  title: string;
  question: string;
  area: string;
  pros: ArgumentPoint[];
  cons: ArgumentPoint[];
  precedents: string[];
  status: "em_debate" | "consolidada" | "superada";
  conclusion?: string;
  relatedProjectIds?: string[];
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Integração com a Athena
- O especialista **Justitia** e o crítico **Critias** utilizam o Codex para conduzir deliberações dialéticas automatizadas sobre teses em debate.

