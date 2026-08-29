# People — Grafo de Contatos & Rede de Colaboradores

## 1. Visão Geral
O módulo de **People** (`/modules/people`) organiza a rede relacional de pesquisadores, coautores acadêmicos, orientadores, juristas e colaboradores institucionais vinculados às frentes de trabalho.

---

## 2. Estrutura de Dados (`Person`)

```ts
export interface Person {
  id: string;
  name: string;
  role: string;
  institution: string;
  email?: string;
  areasOfExpertise: string[];
  collaboratingProjectIds: string[];
  notes?: string;
  relationshipStrength: "alta" | "media" | "baixa";
  createdAt: string;
}
```
