# Forge — Oficina Digital, Templates & Prototipagem

## 1. Visão Geral
O **Forge** (`/modules/forge`) é o ateliê operacional de criação de artefatos digitais. Ele armazena templates reutilizáveis, estruturas de petições jurídicas, matrizes de artigos científicos e scaffolds de projetos.

---

## 2. Estrutura de Dados (`ForgeItem`)

```ts
export type ForgeItemType = "template" | "scaffold" | "prompt_chain" | "script" | "workflow_schema";

export interface ForgeItem {
  id: string;
  title: string;
  type: ForgeItemType;
  description: string;
  category: string;
  content: string;
  variables: string[]; // Variáveis dinâmicas para preenchimento
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```
