# VARYNTH OS — Visão Geral do Núcleo do Sistema

## 1. Visão Geral
O **VARYNTH OS** é o cockpit central que integra workspaces de projetos, acervos bibliográficos, motores dialéticos e copilots cognitivos em uma interface unificada e modular. Desenvolvido em **Next.js 16 (App Router + Turbopack)** e **React 19**, o sistema oferece carregamento ultrarrápido, isolamento de escopo por projeto e experiência visual imersiva.

---

## 2. Estrutura de Rotas e Navegação

| Rota | Módulo / Visualização | Finalidade Principal |
| :--- | :--- | :--- |
| `/` | Landing / Cockpit Entry | Ponto de entrada do sistema e visão de status |
| `/dashboard` | Painel Executivo | Visão panorâmica de tarefas, prazos e métricas ativas |
| `/projects` | Workspaces de Projetos | Hub de projetos, notas rápidas e chats contextuais |
| `/projects/[id]` | Workspace Individual | Ambiente imersivo com abas de Visão Geral, Tarefas e Athena |
| `/modules` | Hub de Módulos | Catálogo de todos os 9 módulos especializados |
| `/modules/athena` | Painel Central da Athena | Centro de comando cognitivo, status de hardware e chat global |
| `/modules/vault` | Vault | Acervo de livros, artigos, jurisprudência e citações |
| `/modules/codex` | Codex | Argument Arena para teses, prós/contras e precedentes |
| `/modules/research` | Research | Evidence Board com força probatória e fontes primárias |
| `/modules/chronos` | Chronos | Calendário, marcos de entrega e prazos processuais |
| `/modules/opportunities` | Opportunities | Radar de editais, chamadas públicas e bolsas |
| `/modules/forge` | Forge | Oficina de protótipos, templates e workflows |
| `/modules/labs` | Labs | Incubadora de hipóteses e experimentos práticos |
| `/modules/people` | People | Grafo de contatos, colaboradores e coautores |
| `/modules/activity` | Activity | Trilha de auditoria cronológica e telemetria |
| `/modules/trash` | Lixeira | Gestão de itens em quarentena com prazo de 10 dias e Undo |

---

## 3. Filosofia Visual & Design System
- **Tema Dark Soberano**: Fundo escuro profundo com contrastes sutis em cinza e acentos ciano/âmbar/esmeralda.
- **Tipografia Escalar**: Hierarquia tipográfica rígida para leitura densa e escaneamento visual rápido.
- **Microinterações Reativas**: Feedback imediato para transições de estado, badges de status e carimbos temporais.

