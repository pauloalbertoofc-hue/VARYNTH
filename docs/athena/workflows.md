# Workflows Determinísticos & Orquestração em DAG — Athena

## 1. Visão Geral
O **`WorkflowBuilder`** e o motor de execução da Athena (`src/lib/athena/runtime/workflow-builder.ts`) estruturam planos operacionais como Grafos Acíclicos Dirigidos (**DAG**). Isso permite encadear tarefas compostas (ex: "Criar projeto ➔ Adicionar tarefas ➔ Agendar prazo no Chronos ➔ Fichar notas no Vault") com execução atômica e segura.

---

## 2. Estrutura do Workflow (`AthenaWorkflow`)

```ts
export interface WorkflowStep {
  id: string;
  name: string;
  agentId?: string;
  toolCall?: {
    toolName: string;
    params: Record<string, unknown>;
  };
  dependencies: string[]; // IDs de passos que devem concluir antes
  timeoutMs: number;
  status: "pending" | "running" | "completed" | "failed";
}

export interface AthenaWorkflow {
  id: string;
  taskId: string;
  steps: WorkflowStep[];
  status: "created" | "running" | "completed" | "failed";
  createdAt: string;
}
```

---

## 3. Tolerância a Falhas e Compensação
Se qualquer passo do DAG falhar durante uma execução encadeada:
- Os passos dependentes subsequentes são pausados imediatamente.
- O usuário recebe um relatório claro do passo exato onde ocorreu a falha.
- Mutações que criaram itens na lixeira podem ser desfeitas via *Undo*.

