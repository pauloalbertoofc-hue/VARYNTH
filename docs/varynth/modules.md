# Hub de Módulos & Registro Dinâmico — VARYNTH OS

## 1. Visão Geral
O **Hub de Módulos** (`/modules`) atua como o catálogo dinâmico de todas as ferramentas e subsistemas especializados do VARYNTH OS. Cada módulo é um componente com rota própria, ciclo de vida independente e contratos estritos de interoperabilidade com o Kernel da Athena.

---

## 2. Inventário de Módulos Implementados

| Módulo | Ícone | Rota | Finalidade Principal |
| :--- | :--- | :--- | :--- |
| **Technical Archive** | 🏛️ | `/modules/technical-archive` | Documentação oficial, ADRs e histórico de engenharia |
| **Projects** | 📁 | `/projects` | Workspaces, tarefas, notas, arquivos, timeline e Athena contextual |
| **Studio Hub** | 🎨 | `/modules/studio` | Hub dos studios Document, Web, Image, Audio, Video e Game |
| **Music** | 🎧 | `/modules/music` | Player, playlists, Music DNA e visualização local (v1.0) |
| **Graph Epistêmico** | 🕸️ | `/modules/graph` | Visualização de relações entre dados do ecossistema |
| **Athena AI** | 🦉 | `/modules/athena` | Centro de comando cognitivo e chat soberano |
| **Vault** | 📚 | `/modules/vault` | Acervo bibliográfico, jurisprudência, livros e artigos |
| **Codex** | ⚖️ | `/modules/codex` | Argument Arena, dialética jurídica e matriz de teses |
| **Research** | 🔬 | `/modules/research` | Evidence Board, síntese científica e fontes empíricas |
| **Chronos** | ⏳ | `/modules/chronos` | Motor temporal, prazos e marcos de projetos |
| **Opportunities** | 🎯 | `/modules/opportunities` | Radar de editais, chamadas públicas e bolsas |
| **Forge** | ⚡ | `/modules/forge` | Oficina digital, protótipos e criação de modelos |
| **Labs** | 🧪 | `/modules/labs` | Incubadora de hipóteses e experimentos de alto impacto |
| **People** | 👥 | `/modules/people` | Grafo de contatos e rede de colaboradores acadêmicos |
| **Activity** | 📊 | `/modules/activity` | Trilha de auditoria e linha do tempo de mutações |
| **Trash** | 🗑️ | `/modules/trash` | Lixeira segura com retenção de 10 dias e Desfazer |
| **LigaHub** | 🏛️ | `http://localhost:8000` | Integração local para gestão de liga acadêmica; disponibilidade depende do serviço externo |

---

## 3. Contratos de Interoperabilidade com a Athena
Nem todo módulo possui a mesma superfície Athena. O registro de ferramentas em `src/lib/athena/tools/registry.ts` é a fonte de verdade para ações disponíveis. Qualquer ação da Athena continua sujeita a `PermissionPolicyEngine`, confirmação humana quando aplicável e regras de sandbox; a presença do módulo não concede autoridade automática.
