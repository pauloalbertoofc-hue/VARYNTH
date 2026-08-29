# Memória, Context Builder & Base Epistêmica — Athena

## 1. Visão Geral
A arquitetura de memória da Athena combina **Memória de Sessão de Curto Prazo**, **Filtro de Memória de Longo Prazo (`MemoryGate`)**, **Extrator Cirúrgico de Contexto (`ContextBuilder`)** e uma **Base Epistêmica Offline Embutida**.

---

## 2. Componentes de Memória

| Componente | Arquivo | Responsabilidade |
| :--- | :--- | :--- |
| `ContextBuilder` | `src/lib/athena/memory/context-builder.ts` | Extrai cirurgicamente apenas as tarefas, teses e prazos relevantes para a consulta atual |
| `MemoryManager` | `src/lib/athena/memory/memory-manager.ts` | Gerencia o histórico de episódios, sessões e interações |
| `MemoryGate` | `src/lib/athena/memory/memory-gate.ts` | Avalia se uma informação é relevante e confiável antes de persistir na memória permanente |
| `EpistemicStore` | `src/lib/athena/knowledge/epistemic-concepts.ts` | Base embutida com conceitos de Hermenêutica, Método Científico, Jogos e Latim |
| `LocalRAG` | `src/lib/athena/memory/local-rag.ts` | Mecanismo de busca e indexação local de documentos |

---

## 3. O Princípio de Extração Cirúrgica (*Minimal Disclosure*)
O `ContextBuilder` segue a regra de **não despejar todos os dados do usuário** na memória operacional:
- Se a pergunta é sobre *Direito/Teses*, extrai dados do **Codex** e **Vault**.
- Se a pergunta é sobre *Prazos/Tarefas*, extrai dados do **Chronos** e **Projects**.
- Se a pergunta é puramente social (*"como você está?"*), **não extrai nenhum dado pessoal**.
