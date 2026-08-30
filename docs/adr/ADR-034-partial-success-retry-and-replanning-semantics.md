# ADR-034: Semântica de Sucesso Parcial, Retentativas e Replanning

## Status
Accepted

## Data
2026-08-29

## Contexto
Em fluxos criativos complexos, falhas pontuais em uma etapa não devem destruir o progresso de etapas independentes, e mudanças no pedido devem preservar o histórico de revisões.

## Decisão
1. Adotar a semântica `PARTIAL` quando saídas obrigatórias falham, e `COMPLETED_WITH_WARNINGS` quando falhas ocorrem apenas em saídas opcionais.
2. Limitar retentativas a 2 tentativas rastreadas apenas para erros recuperáveis, preservando o histórico de falhas.
3. Preservar revisões anteriores em histórico (Princípio Alex) e gerar `PlanDiff` semântico em caso de replanning.
4. Preservar outputs commitados válidos em caso de cancelamento tardio do usuário.

## Consequências
- **Ganhos**: Resiliência pragmática, zero desperdício de trabalho computacional útil e rastreabilidade histórica.
- **Trade-offs**: Maior complexidade na consolidação do relatório de status final do plano.
