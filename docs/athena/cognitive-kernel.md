# Kernel Cognitivo V4 & Executive Controller — Athena

## 1. Visão Geral
O **Kernel Cognitivo V4** é o núcleo executivo da Athena (`src/lib/athena/kernel/`). Ele orquestra os ciclos de percepção, avaliação de orçamentos computacionais, agendamento de tarefas e consolidação das respostas finais.

---

## 2. Componentes Centrais do Kernel

| Componente | Arquivo | Responsabilidade |
| :--- | :--- | :--- |
| `PerceptionEngine` | `src/lib/athena/kernel/perception.ts` | Converte strings e escopos em `AthenaTask` fortemente tipada |
| `ExecutiveController` | `src/lib/athena/kernel/executive-controller.ts` | Gerencia o ciclo de vida completo de uma requisição com orçamento |
| `CognitiveRouter` | `src/lib/athena/kernel/router.ts` | Roteia tarefas para os agentes ou ferramentas especialistas mais adequados |
| `TaskScheduler` | `src/lib/athena/kernel/scheduler.ts` | Executa planos de tarefas sequenciais ou paralelos em grafo DAG |
| `ReflectionEngine` | `src/lib/athena/kernel/reflection.ts` | Avalia criticamente as respostas antes da entrega final |
| `ResponseBuilder` | `src/lib/athena/kernel/response-builder.ts` | Monta a estrutura final de `AthenaResponse` com cards de ação e proveniência |
| `ConfidenceEngine` | `src/lib/athena/kernel/confidence-engine.ts` | Avalia o nível de confiança técnica (HIGH, MEDIUM, LOW) |
| `ProvenanceTracker` | `src/lib/athena/kernel/provenance.ts` | Rastreia as fontes e entidades consultadas para gerar a resposta |

---

## 3. Gestão de Orçamento Computacional (`BudgetTier`)
O `ExecutiveController` opera com limites orçamentários definidos para evitar loops ou travamento de interface:
- **`FAST`**: Max 1 agente, timeout 2000 ms (Fast Path conversacional).
- **`STANDARD`**: Max 3 agentes, timeout 8000 ms (Consultas e ideação padrão).
- **`EXHAUSTIVE`**: Max 7 agentes, timeout 15000 ms (Deliberações profundas multiagente e synthesis científica).
