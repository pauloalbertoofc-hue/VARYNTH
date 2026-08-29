# Vault — Acervo Universal de Conhecimento & Fichamento

## 1. Visão Geral
O **Vault** (`/modules/vault`) é a biblioteca central do VARYNTH OS. Ele armazena, cataloga e organiza livros, artigos científicos, jurisprudência, leis, citações e anotações teóricas.

---

## 2. Estrutura de Dados (`VaultItem`)

```ts
export type VaultItemType = "artigo" | "livro" | "jurisprudencia" | "lei" | "pdf" | "link" | "video" | "citacao" | "codigo" | "ideia";
export type ReadingStatus = "para_ler" | "lendo" | "concluido" | "arquivado";

export interface VaultItem {
  id: string;
  title: string;
  type: VaultItemType;
  content?: string;
  url?: string;
  author?: string;
  source?: string;
  tags: string[];
  category: string;
  relatedProjectIds?: string[];
  readingStatus: ReadingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Integração com a Athena
- O agente **Mnemosyne** utiliza o Vault como fonte primária para recuperar citações e fichamentos anteriores.
- O validador da Athena pode sugerir conectar novas pesquisas com obras já catalogadas no Vault.

