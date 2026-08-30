# ADR-040: Structured Response Strategy Layer

## Status
ACCEPTED

## Contexto
O pipeline cognitivo da Athena separava a interpretação semântica da execução determinística, mas transferia o contexto interpretado diretamente para templates de linguagem no `PersonaEngine`. Isso causava perda de nuances comunicativas, respostas genéricas em momentos de erro ou mal-entendido, e dificuldade para controlar verbosidade, tom e proteção contra repetição de aberturas.

## Decisão
1. **Introdução da Response Strategy Layer (`AthenaResponseStrategyEngine`)**:
   - Camada intermediária que planeja a estratégia comunicativa (`ResponseIntent`) antes de qualquer textualização.
   - Define: `mode`, `tone`, `verbosity`, `uncertaintyType`, `shouldAskQuestion`, `keyFacts` com proveniência e `suggestedNextSteps`.
2. **Isolamento Absoluto de Execução e Autoridade**:
   - `AthenaResponseStrategyEngine` **nunca executa ferramentas** e **nunca concede autoridade operacional**.
   - As decisões de permissão continuam restritas ao `PermissionPolicyEngine` e as mutações ao `ExecutiveController`.
3. **Desambiguação Direcionada e Proteção de Loop**:
   - Quando há ambiguidade entre entidades, a estratégia consulta candidatos reais no contexto e formula perguntas direcionadas (*"Você quer o projeto A ou B?"*).
   - Se o usuário responder de forma ambígua repetidamente, o contador de tentativas avança e o sistema reformula apresentando opções numeradas em vez de repetir o mesmo texto em loop.

## Consequências
- Aberturas e respostas adaptam-se naturalmente ao contexto (concisas para perguntas diretas, detalhadas para reflexões conceituais).
- Resoluções de erros e mal-entendidos tornam-se claras, empáticas e objetivas.

