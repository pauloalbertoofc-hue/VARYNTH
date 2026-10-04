# ADR-045 — Lifecycle de Knowledge e revisão de dependências

## Status

Aceito e implementado incrementalmente.

## Contexto

Freshness descreve atualidade epistemológica, mas não expressava se um item estava em rascunho, revisão, ativo ou retirado. Relações `DERIVED_FROM` e `DEPENDS_ON` existiam, mas alterações de fonte não disparavam revisão consistente para os itens que dela dependem.

## Decisão

1. Acrescentar `lifecycleState` opcional ao `KnowledgeItem`; ausência em registros legados equivale a `ACTIVE`.
2. Validar transições no serviço central. `DRAFT`/`REVIEW` são restritos ao owner; `STALE` pode ser consultado com prioridade reduzida; `ARCHIVED`/`DEPRECATED` ficam fora do retrieval e discovery.
3. Publicar somente itens `ACTIVE`.
4. Atualizar uma fonte marca seus dependentes recursivos como `REVIEW` e `POSSIBLY_STALE`, sem alterar conteúdo ou versão documental dos dependentes.
5. Revogar uma fonte invalida derivados (`DERIVED_FROM`) e coloca dependências não derivadas (`DEPENDS_ON`) em revisão, preservando relações e histórico.
6. Invalidar o índice/cache após persistência de alterações e propagar o lifecycle no KnowledgePacket.

## Consequências

O lifecycle não substitui freshness, validade temporal, policy de visibilidade ou revogação. Estados administrativos são persistidos sem migração destrutiva, e o serviço continua a fonte do enforcement independentemente da UI.
