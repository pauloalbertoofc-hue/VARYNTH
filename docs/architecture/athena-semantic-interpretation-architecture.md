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

## 4. Aprovação coloquial e separação entre plano e esclarecimento

`hasPendingSlot` representa uma pergunta de esclarecimento em aberto; não é autorização para executar. O analisador pragmático recebe apenas `hasPendingPlan` como contexto de aprovação, e a fusão estatística também rebaixa `APPROVAL` para conversa social quando não existe plano pendente. Isso evita que uma resposta curta a uma dúvida seja confundida com confirmação operacional.

O vocabulário contextual inclui variantes formais e coloquiais como “Confirmo”, “Pode mandar” e “Manda ver no rascunho”. O caminho operacional reconhece essas formas somente para localizar um plano persistido na mesma sessão; pontuação terminal é normalizada antes da comparação. Sem plano correspondente, nenhuma mutação é executada e Athena informa que não há confirmação pendente.

Referências comparativas plurais como “Compare os dois” só são resolvidas quando a sessão ou a mensagem atual contêm dois alvos rastreáveis. Sem esse par, Athena pede os nomes dos dois itens em vez de inferir o segundo. Títulos de projetos explicitamente mencionados na mesma mensagem contam como alvos, inclusive quando há mais de um.

Marcadores explícitos de mudança de assunto (“mudando de assunto”, “outra coisa”, “agora sobre...”) suspendem o projeto ativo quando nenhum novo projeto é citado. Entidades recentes permanecem no histórico para referências explícitas, mas não bastam para ancorar “isso/ele/ela” no contexto novo; o usuário pode retomar o tópico interrompido com “voltando a...”.

O adaptador conversacional dos especialistas também remove o turno atual da busca de antecedentes, não atribui uma referência curta a uma mensagem de mudança de assunto, e só atravessa essa fronteira quando o usuário pede explicitamente para retomar o tema anterior. A janela de histórico continua limitada à sessão ativa; assistentes não são tratados como evidência independente do pedido do usuário.

Verificação local em 2026-10-11: `npm run test:athena-semantic` passou 33/33 cenários, incluindo execução governada do plano exato na mesma sessão e recusa sem plano; `npm run test:athena-intelligence` passou 100 cenários e `npm run test:athena-communication` cobre agora respostas compatíveis, referências comparativas sem alvo e alvos nomeados. Esses resultados são testes automatizados, não substituem um walkthrough manual autenticado.

