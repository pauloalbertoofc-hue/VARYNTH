# Action Layer, Tool Manager & Ferramentas — Athena

## 1. Visão Geral
A **`ActionLayer`** e o **`ToolManager`** (`src/lib/athena/tools/tool-manager.ts`) formam a ponte entre o raciocínio cognitivo da Athena e as mutações reais no banco de dados do VARYNTH OS.

---

## 2. Catálogo de 14 Ferramentas Determinísticas

| Ferramenta | Módulo Alvo | Tipo | Descrição |
| :--- | :--- | :--- | :--- |
| `tasks.create` | Tasks / Projects | Mutação | Cria nova tarefa com prioridade e projeto associado |
| `tasks.list` | Tasks | Leitura | Lista tarefas pendentes ou filtradas por status |
| `tasks.complete` | Tasks | Mutação | Marca tarefa como concluída e registra no Audit |
| `notes.create` | Notes / Projects | Mutação | Cria nota rápida ou fichamento no escopo ativo |
| `projects.list` | Projects | Leitura | Lista todas as workspaces ativas e seus metadados |
| `projects.read` | Projects | Leitura | Lê os detalhes profundos de um projeto específico |
| `chronos.listDeadlines`| Chronos | Leitura | Consulta prazos iminentes e eventos do calendário |
| `chronos.createEvent` | Chronos | Mutação | Agenda um novo marco de entrega ou prazo |
| `vault.search` | Vault | Leitura | Busca obras, autores ou tags no acervo do Vault |
| `codex.listTheses` | Codex | Leitura | Lista teses e controvérsias na Argument Arena |
| `research.listEvidences`| Research | Leitura | Consulta evidências empíricas no Evidence Board |
| `labs.read` | Labs | Leitura | Inspeciona experimentos e hipóteses em andamento |
| `trash.moveWithUndo` | Trash | Mutação | Move item para a lixeira de 10 dias com suporte a Undo |
| `diagnostics.run` | Kernel / Health | Leitura | Executa diagnóstico técnico de integridade dos subsistemas |

---

## 3. Garantias de Execução
- **Zero Mutação Espúria**: Nenhuma ferramenta é executada em diálogos classificados como `CONVERSATION`.
- **Trilha de Auditoria Obrigatória**: Toda execução de ferramenta de escrita emite registro imutável no `AuditTrail`.

