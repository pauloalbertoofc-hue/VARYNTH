# Atividade & Trilha de Auditoria — VARYNTH OS

## 1. Visão Geral
O módulo de **Atividade** (`/modules/activity`) registra e visualiza a trilha de auditoria (*Audit Trail*) de todas as mutações e eventos significativos ocorridos no ecossistema. Ele assegura total transparência operacional, permitindo rastrear quando e por quem cada recurso foi criado, modificado, concluído ou movido para a lixeira.

---

## 2. Estrutura do Evento de Auditoria (`ActivityItem`)

```ts
export type ActivityActionType =
  | "create"
  | "update"
  | "delete"
  | "complete"
  | "restore"
  | "deliberate"
  | "workflow_execute";

export interface ActivityItem {
  id: string;
  actor: "user" | "athena" | "system";
  action: ActivityActionType;
  entityType: "project" | "task" | "note" | "vault" | "codex" | "research" | "chronos" | "trash";
  entityTitle: string;
  entityId: string;
  timestamp: string;
  details?: Record<string, unknown>;
}
```

---

## 3. Rastreabilidade de Autoria Cognitiva
Quando a Athena executa ações solicitadas pelo usuário (por exemplo, criando uma tarefa ou rascunhando uma nota rápida), o registro armazena:
- `actor: "athena"`
- `details: { triggeredByPrompt: "Crie uma tarefa..." }`

Isso permite filtrar com facilidade o trabalho manual do usuário versus as automações executadas pelo copilot.
