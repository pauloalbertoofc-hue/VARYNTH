# ADR-023: Motor Declarativo de Regras ("Rules Before Code") e Play Mode em Sandbox

## Status
ACCEPTED

## Contexto
Permitir que inteligência artificial crie comportamentos em jogos apenas através de scripts arbitrários gera vulnerabilidades de segurança, opacidade de depuração e risco de travamento por loops infinitos.
Além disso, testar o jogo (`Play Mode`) não pode sobrescrever acidentalmente o estado original de desenvolvimento.

## Decisão
1. **Regras Antes de Código**: Priorizar regras declarativas (`Trigger -> Conditions -> Actions`) com validação estática prévia.
2. **Proteção contra Tempestade de Regras (Rule Storms)**: `RuleExecutionContext` limita a profundidade de recursão (`maxDepth = 8`) e passos por tick (`maxSteps = 50`), encerrando com segurança em caso de `RULE_EXECUTION_BUDGET_EXCEEDED`.
3. **Fila de Eventos Determinística & Timestep Fixo**: Eventos são processados em FIFO com prioridade estável em passos fixos de simulação (60Hz / 16.666ms), com PRNG de seed reproduzível.
4. **Isolamento Estrito do Play Mode**: A sessão de teste (`GameTestSession`) em Sandbox opera sobre uma cópia volátil em memória, mantendo intacto o `GameDocumentState` editável.

## Consequências
### Positivas
* Execução segura sem congelamento do navegador.
* Capacidade de replay determinístico para depuração e testes pela Athena.
### Negativas / Mitigações
* Mecânicas matemáticas de altíssima complexidade exigem scripts em Sandbox via Web Studio.

