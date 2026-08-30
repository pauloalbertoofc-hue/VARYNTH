# ADR-033: Execução Governada Multi-Studio e Paralelismo Seguro

## Status
Accepted

## Data
2026-08-29

## Contexto
A execução de múltiplos steps em diferentes estúdios pode gerar concorrência descontrolada, vazamento de IDs temporários e violação de políticas de autorização.

## Decisão
1. Exigir que todo step executável transite obrigatoriamente por `ToolManager` $\rightarrow$ `PermissionPolicyEngine` $\rightarrow$ `SystemInvariantValidator`.
2. Congelar versões dos artefatos de entrada no início do step (`frozenInputVersions`).
3. Bloquear conflitos de escrita concorrente inspecionando `writeTargets` no scheduler.
4. Mapear `tempId` para `resolvedArtifactId` e registrar relacionamentos no Grafo Criativo estritamente após o commit dos outputs (`INV-023`).

## Consequências
- **Ganhos**: Execução paralela sem race conditions, rastreabilidade total e conformidade com o modelo de segurança soberano.
- **Trade-offs**: Serialização de steps que compartilham o mesmo alvo de gravação.
