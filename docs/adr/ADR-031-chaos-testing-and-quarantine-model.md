# ADR-031: Testes de Caos Determinísticos e Modelo de Quarentena de Assets

## Status
Aceito

## Contexto
Garantir a resiliência contínua do VARYNTH OS exige simular condições extremas: esgotamento de quota de disco, falhas de I/O em pontos exatos de mutação, quedas de processo e arquivos físicos corrompidos. Tais falhas precisam ser testadas de forma determinística sem expor vetores de injeção em produção.

## Decisão
1. Implementar o `FailureInjector` com gerador de números pseudo-aleatórios determinístico (PRNG com semente fixa) restrito estritamente a ambientes de teste e desenvolvimento. Em produção, qualquer tentativa de ativação do harness é bloqueada.
2. Definir o status **`QUARANTINED`** para assets físicos com corrupção de bytes, checksum incompatível ou headers inválidos.
3. Bloquear o consumo de assets em quarentena por novos jobs de renderização e compilação, permitindo que permaneçam no sistema para diagnóstico e restauração sem corromper novos outputs.
4. O gerador de planos de reparo (`RepairPlan`) produz propostas inspecionáveis com níveis de risco explícitos, não outorgando nenhuma autoridade executiva automática para agentes autônomos sem passar pelas políticas de permissão do usuário.

## Consequências
- **Positivas**: Cenários de caos e degradação são 100% reproduzíveis em testes automatizados, e dados corrompidos são isolados sem perda do histórico forense.
- **Trade-offs**: Testes de resiliência necessitam de reset explícito do estado do injetor entre execuções.

