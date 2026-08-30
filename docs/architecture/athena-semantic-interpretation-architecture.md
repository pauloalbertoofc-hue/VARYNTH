# VARYNTH OS — ATHENA SEMANTIC INTERPRETATION ARCHITECTURE
## Especificação Técnica da Camada Semântica Local Híbrida

---

## 1. Visão Geral da Arquitetura

A Camada Semântica Local Híbrida da Athena atua como o elo de tradução semântica entre a normalização linguística/resolução de entidades e o Decision Router.

```text
               ┌─────────────────────────────────────────────────────────────┐
               │                     MENSAGEM DO USUÁRIO                     │
               └──────────────────────────────┬──────────────────────────────┘
                                              ▼
               ┌─────────────────────────────────────────────────────────────┐
               │    1. Normalização & Resolução de Deíticos / Anáforas       │
               │    (ConversationManager & InterruptedTopicStack)            │
               └──────────────────────────────┬──────────────────────────────┘
                                              ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────────┐
 │               2. SEMANTIC INTERPRETATION LAYER (SemanticInterpretationEngine)           │
 │                                                                                         │
 │  ┌─────────────────────────────────────┐   ┌─────────────────────────────────────────┐  │
 │  │  NoiseDetector                      │   │  NegationAnalyzer                       │  │
 │  │  • Rejeição de Ruído Alfanumérico   │   │  • Veto Primário & Negação de Escopo    │  │
 │  │  • Preservação de Identificadores   │   │  • Sentimento Negativo + Nova Ação      │  │
 │  └──────────────────┬──────────────────┘   └────────────────────┬────────────────────┘  │
 │                     │                                           │                       │
 │  ┌──────────────────┴──────────────────┐   ┌────────────────────┴────────────────────┐  │
 │  │  PragmaticsAnalyzer                 │   │  SlotExtractor                          │  │
 │  │  • Pergunta de Capacidade vs Comando│   │  • Proveniência com Span/Valor          │  │
 │  │  • Sarcasmo Reverso & Desabafo      │   │  • Autocorreção Intra-Frase             │  │
 │  │  • Aprovação Contextual             │   │                                         │  │
 │  └──────────────────┬──────────────────┘   └────────────────────┬────────────────────┘  │
 │                     │                                           │                       │
 │  ┌──────────────────┴──────────────────┐   ┌────────────────────┴────────────────────┐  │
 │  │  LocalSimilarityEngine              │   │  LocalSemanticLMAdapter (Opcional)      │  │
 │  │  • N-gram TF-IDF & Cosseno Offline  │   │  • Ollama JSON Estrito + Timeout 1.5s   │  │
 │  │  • Métrica de Margem Top-1 vs Top-2 │   │  • Circuit Breaker (CLOSED/OPEN/HALF)   │  │
 │  └──────────────────┬──────────────────┘   └────────────────────┬────────────────────┘  │
 │                     └──────────────────────┬────────────────────┘                       │
 │                                            ▼                                            │
 │                               Semantic Fusion & Trace                                   │
 └────────────────────────────────────────────┬────────────────────────────────────────────┘
                                              ▼
               ┌─────────────────────────────────────────────────────────────┐
               │               3. Decision & Boundary Router                 │
               └──────┬───────────────────────┬───────────────────────┬──────┘
                      │                       │                       │
      [CONVERSATION]  │  [COGNITIVE_REQUEST]  │  [OPERATIONAL_REQUEST]│
                      ▼                       ▼                       ▼
    ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
    │  Fast Path Social     │ │  Cognitive Path       │ │  Operational Path     │
    │  • Saudações & Humor  │ │  • Persona Engine     │ │  • ToolManager (26)   │
    │  • Empatia a Desabafo │ │  • Conselho Agentes   │ │  • Policy Engine      │
    │  • 0 acessos a dados  │ │  • Epistemic Base     │ │  • System Invariants  │
    └───────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

---

## 2. Invariantes de Interpretação Semântica (`INV-037..042`)

| Invariante | Título | Regra de Segurança |
| :--- | :--- | :--- |
| **`INV-037`** | *Semantic Layer Execution Isolation* | A camada semântica apenas sugere significado e nunca executa ferramentas diretamente. |
| **`INV-038`** | *Deterministic Policy Superiority* | Nenhuma proposta neural pode sobrepor decisões determinísticas do `PermissionPolicyEngine`. |
| **`INV-039`** | *Low-Confidence Destructive Protection* | Mutações destrutivas com baixa confiança semântica são obrigatoriamente bloqueadas para esclarecimento. |
| **`INV-040`** | *Noise Rejection & Operational Safety* | Ruído alfanumérico aleatório é classificado como `UNKNOWN_INPUT` e nunca dispara ações operacionais. |
| **`INV-041`** | *Deterministic Fallback on Model Failure* | A indisponibilidade ou timeout do Ollama preserva 100% da funcionalidade via baseline estatístico determinístico. |
| **`INV-042`** | *Approval Authority Context Requirement* | Aprovação de execução (*"Pode"*, *"Manda bala"*) só é válida na presença de plano pendente ativo não defasado. |

---

## 3. Circuit Breaker do Adaptador Neural Local

```text
            ┌───────────────────────────────────────────────┐
            │                     CLOSED                    │
            │   (Operação normal; timeout de 1500ms ativo)  │
            └───────┬───────────────────────────────▲───────┘
                    │                               │
       3 falhas consecutivas                1 sucesso no probe
                    │                               │
                    ▼                               │
            ┌───────────────────────┐       ┌───────┴───────┐
            │         OPEN          │       │   HALF_OPEN   │
            │ (Rejeição imediata;   │──────▶│ (Permite 1    │
            │  cooldown de 30s)     │       │  requisição)  │
            └───────────────────────┘       └───────────────┘
```

