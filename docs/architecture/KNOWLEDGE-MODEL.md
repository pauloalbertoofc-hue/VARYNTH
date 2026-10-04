# Knowledge Model

`KnowledgeItem` distingue kind, assertion, visibility, sensitivity, provenance, authority, freshness, version, projetos e artifacts relacionados.

O lifecycle é metadata aditiva (`ACTIVE`, `DRAFT`, `REVIEW`, `STALE`, `ARCHIVED`, `DEPRECATED`); registros legados sem campo são interpretados como `ACTIVE`. Transições são validadas no serviço. `DRAFT` e `REVIEW` só podem ser consultados/descobertos pelo owner; `STALE` continua consultável com prioridade menor; `ARCHIVED` e `DEPRECATED` saem do índice de retrieval. Publicação exige `ACTIVE`.

Uma atualização de fonte percorre relações `DERIVED_FROM` e `DEPENDS_ON` e marca os descendentes revisáveis como `REVIEW`, preservando conteúdo, relações, provenance e versão do texto derivado. Revogar a fonte invalida recursivamente os derivados, mas marca dependências não derivadas para revisão, sem apagá-las. A invalidação/reconstrução do retrieval index acompanha as mudanças de estado.

Knowledge não é Experience, Preference, Memory ou Policy. Sources e derivados permanecem rastreáveis; conflitos são agrupados; revogação remove do retrieval sem destruir histórico.

O armazenamento atual usa IndexedDB/memory fallback e mantém o princípio local-first. Nenhum vector database ou graph database é fonte de verdade.
