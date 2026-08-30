# ADR-035: Fronteira Soberana de Autoridade da Athena

## Status
Accepted

## Data
2026-08-29

## Contexto
Definir claramente os limites entre compreensão, planejamento, execução e publicação pela Athena no VARYNTH OS.

## Decisão
1. Estabelecer que a aprovação do plano criativo (`ApprovalScope`) autoriza exclusivamente a criação de rascunhos e execuções de render locais.
2. A publicação (`PUBLISH`) ou exclusão permanente (`DELETE_HARD`) nunca é concedida ou inferida pela conclusão do plano criativo (`INV-028`).
3. Revalidar capacidades imediatamente antes da execução do step (`CAPABILITY_CHANGED`).
4. Reconstruções de outputs derivados (`rebuildAffectedOutputs`) geram planos explícitos e inspecionáveis em vez de cascatas silenciosas.

## Consequências
- **Ganhos**: Soberania humana incondicional sobre dados e publicações, transparência e explicabilidade determinística.
- **Trade-offs**: Exigência de confirmações contextuais em ações de alto impacto.

