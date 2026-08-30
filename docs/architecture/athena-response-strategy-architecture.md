# VARYNTH OS — ATHENA RESPONSE STRATEGY ARCHITECTURE
## Especificação Técnica da Camada de Estratégia de Resposta & Composição de Persona

---

## 1. Visão Geral do Pipeline

```text
               ┌─────────────────────────────────────────────────────────────┐
               │                     MENSAGEM DO USUÁRIO                     │
               └──────────────────────────────┬──────────────────────────────┘
                                              ▼
               ┌─────────────────────────────────────────────────────────────┐
               │         ConversationManager (Sessão & Anáforas)             │
               └──────────────────────────────┬──────────────────────────────┘
                                              ▼
               ┌─────────────────────────────────────────────────────────────┐
               │         SemanticInterpretationEngine (Intenção & Slots)     │
               └──────────────────────────────┬──────────────────────────────┘
                                              ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────────┐
 │               ATHENA RESPONSE STRATEGY ENGINE (AthenaResponseStrategyEngine)            │
 │                                                                                         │
 │  ┌─────────────────────────────────────┐   ┌─────────────────────────────────────────┐  │
 │  │  Fact Grounding & Provenance        │   │  Uncertainty Taxonomy Engine            │  │
 │  │  • Consulta tarefas/projetos reais  │   │  • UNKNOWN vs NOT_FOUND                 │  │
 │  │  • Cálculo de progresso de projetos │   │  • CAPABILITY_UNAVAILABLE vs EXEC_FAIL  │  │
 │  │  • Revalidação de Jobs voláteis     │   │  • AMBIGUOUS vs LOW_CONFIDENCE          │  │
 │  └──────────────────┬──────────────────┘   └────────────────────┬────────────────────┘  │
 │                     │                                           │                       │
 │  ┌──────────────────┴──────────────────┐   ┌────────────────────┴────────────────────┐  │
 │  │  Targeted Clarification             │   │  Misunderstanding Repair                │  │
 │  │  • Candidatos reais e autorizados   │   │  • Acolhimento de frustração conciso    │  │
 │  │  • Proteção contra loops (1..3)     │   │  • Recalibração não-defensiva           │  │
 │  └──────────────────┬──────────────────┘   └────────────────────┬────────────────────┘  │
 │                     └──────────────────────┬────────────────────┘                       │
 │                                            ▼                                            │
 │                                      ResponseIntent                                     │
 │                      (mode, tone, verbosity, keyFacts, candidates)                      │
 └────────────────────────────────────────────┬────────────────────────────────────────────┘
                                              ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────────┐
 │               PERSONA & RESPONSE COMPOSITION ENGINE (AthenaPersonaEngine)               │
 │                                                                                         │
 │  • Princípio "Answer First, Detail Second" (Zero Over-Briefing)                         │
 │  • Rotação Dinâmica de Aberturas (Memória Efêmera em RAM)                               │
 │  • Ajuste de Tom por Escopo (LEGAL -> Técnico, RESEARCH -> Epistêmico)                  │
 │  • Enriquecimento Neural Opcional sob FACT LOCK (Fail-Closed)                           │
 └────────────────────────────────────────────┬────────────────────────────────────────────┘
                                              ▼
                                        AthenaMessage
```

---

## 2. Taxonomia de Incerteza e Resposta Correspondente

| Tipo de Incerteza | Significado Operacional | Estratégia de Comunicação |
| :--- | :--- | :--- |
| **`UNKNOWN`** | Dado não existente no VARYNTH OS. | *"Não tenho essa informação registrada no ecossistema VARYNTH."* |
| **`NOT_FOUND`** | Entidade identificada linguisticamente, mas não localizada no banco. | *"Entendi o termo, mas não encontrei nenhum projeto ou item com esse nome."* |
| **`AMBIGUOUS`** | Múltiplos candidatos válidos detectados. | Formulação direcionada com candidatos reais (*"Você quis dizer 'Projeto A' ou 'Projeto B'?"*). |
| **`CAPABILITY_UNAVAILABLE`** | Subsistema local ausente (ex.: ffmpeg). | Explicação do que falhou, o que permanece salvo e próximas opções viáveis. |
| **`LOW_CONFIDENCE`** | Entendimento semântico incerto ou truncado. | Solicitação polida de esclarecimento de foco. |
| **`EXECUTION_FAILED`** | Falha de execução de step orquestrado. | Error explanation fundamentada em 3 partes: *What happened*, *What is safe*, *What can happen next*. |

---

## 3. Fact Lock & Proteção Contra Alucinação

```text
        [Modelo Neural Local]
                 │ (Texto candidato gerado)
                 ▼
        [FactLockValidator]
                 │
        ┌────────┴────────┐
   (Válido)          (Contradição/Alucinação de Fato)
        │                 │
        ▼                 ▼
 [Entrega Texto]    [Descarta saída neural e usa Fallback Determinístico (FAIL-CLOSED)]
```
