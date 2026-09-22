# Provenance e versionamento

Todo `KnowledgeItem` registra origem, autoridade, actor, data, versão, freshness e referências derivadas quando aplicável.

Atualizações incrementam a versão e invalidam o cache de consultas. Fontes divergentes recebem `conflictGroupId`; nenhuma fonte é sobrescrita silenciosamente. A resposta estruturada mantém `evidence`, `sources`, `confidence`, `assumptions` e `limitations`.
