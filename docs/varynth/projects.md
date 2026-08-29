# Workspaces, Projetos & Tarefas — VARYNTH OS

## 1. Visão Geral
No **VARYNTH OS**, toda produção intelectual ou técnica é organizada em torno de **Workspaces de Projetos**. Cada projeto atua como um contêiner de escopo isolado contendo suas próprias tarefas, anotações rápidas, documentos vinculados e uma instância contextual da **Athena**.

---

## 2. Estrutura de Dados do Projeto (`Project`)

```ts
export type ProjectCategory = "software" | "pesquisa" | "estudo" | "negocio" | "academico" | "experimento" | "pessoal";
export type ProjectStatus = "planejamento" | "ativo" | "em_espera" | "concluido" | "arquivado";
export type PriorityLevel = "baixa" | "media" | "alta" | "urgente";

export interface Project {
  id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  priority: PriorityLevel;
  deadline?: string;
  progress?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Gestão de Tarefas (`Task`)
Tarefas representam unidades operacionais de avanço:
- **Estados**: `a_fazer`, `em_andamento`, `revisao`, `concluida`, `bloqueada`.
- **Prioridades**: `baixa`, `media`, `alta`, `urgente`.
- **Vínculo com Ator**: Cada tarefa registra se foi criada pelo usuário manualmente ou gerada autonomamente pela Athena sob solicitação.

---

## 4. O Sidecar Contextual da Athena na Workspace
Ao abrir um projeto específico (`/projects/[id]`), a aba **Athena** ativa automaticamente o escopo do projeto:
- A Athena recebe o título, categoria, tarefas pendentes e notas vinculadas daquele projeto como contexto primário.
- Anáforas como *"esse projeto"* ou *"nessa pesquisa"* são resolvidas diretamente para a workspace ativa sem ambiguidades.
