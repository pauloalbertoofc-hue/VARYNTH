# ADR-037: Neural Flexibility vs Symbolic Authority Boundary

## Status
ACCEPTED

## Contexto
Sistemas cognitivos modernos frequentemente cometem o erro arquitetural de conceder autoridade de execução direta a modelos de linguagem (Function Calling cego), abrindo vetores para prompt injections, bypass de políticas e mutações não intencionais.

No VARYNTH OS, a soberania tecnológica exige separação absoluta entre a flexibilidade semântica e a autoridade simbólica.

## Decisão
1. **Neural for Flexibility**: Modelos neurais locais auxiliam na interpretação de paráfrases, desambiguação e redação dialética.
2. **Symbolic for Authority**: Toda mutação operacional (criação de tarefas, notas, movimentação para a lixeira, planos de execução) é governada deterministamente pelo `PermissionPolicyEngine` e validada por `SystemInvariantValidator`.
3. **Structured State for Truth**: O banco de dados local (Workspaces, Tasks, Graph, Vault, Chronos) permanece como a única fonte de verdade factual.
4. **Isolamento de Papéis (`USER_MESSAGE` vs `CONTEXT_DATA`)**:
   - Todo conteúdo consumido de artefatos, código, documentos, metadados ou transcrições é marcado explicitamente como `CONTEXT_DATA`, nunca como instrução de usuário.
   - Tentativas de injeção indireta em documentos não se transformam em comandos operacionais.

## Consequências
- Invariantes `INV-037` (Isolamento de Execução) e `INV-038` (Superioridade da Política Determinística) formalizadas e ativas.
- Resiliência comprovada nos testes de injeção indireta e chamadas maliciosas (`ATHINT-057`, `SEM-REG-020`).

