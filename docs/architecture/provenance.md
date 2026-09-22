# Provenance de conhecimento

## Finalidade

Provenance permite responder de onde veio um item, quem o registrou, quando foi observado, qual autoridade foi atribuída à fonte e quais itens originaram um derivado. Autoridade ajuda a ordenar e apresentar fontes; nunca converte uma fonte em verdade automática.

## Contrato atual

`KnowledgeProvenance` contém `sourceType`, `sourceReference`, `addedBy`, `agentId`, `createdAt`, `observedAt`, `derivedFromIds`, `authority` e `inferred`. `KnowledgeItem` acrescenta domínio, owner, contribuidores, visibilidade, sensibilidade, tipo/assertion, versão, validade temporal, estado de freshness, projetos e artifacts relacionados.

Os valores de authority incluem `PRIMARY_SOURCE`, `OFFICIAL_REFERENCE`, `USER_PROVIDED`, `INTERNAL_DOCUMENT`, `AGENT_GENERATED`, `EXPERIENCE_DERIVED` e `UNKNOWN`. Assertion separa `FACT`, `INTERPRETATION`, `OPINION`, `HYPOTHESIS`, `PROCEDURE` e `REFERENCE`. São metadados epistêmicos, não uma validação automática do conteúdo.

## Vault, derivados e versões

O adaptador do Vault usa `sourceType: VAULT_ITEM` e aponta `sourceReference` para o storage ID, URL ou ID do item, conforme disponível. Itens transformados ou resumidos devem conservar a referência original e preencher `derivedFromIds` quando a linhagem for conhecida. Atualmente o adaptador não registra posição de página/trecho e não preenche derivação de chunks; consumidores não devem alegar rastreabilidade granular que o registro ainda não oferece.

Atualizar um item preserva `createdAt`, incrementa `version` e aponta `supersedesId` para a versão anterior. Conflitos de fontes são agrupados sem sobrescrita silenciosa. Revogação marca `invalidatedAt`; itens revogados e versões substituídas deixam de entrar em retrieval, enquanto os registros históricos permanecem disponíveis para auditoria.

`validFrom`, `validUntil`, `observedAt` e `freshness` permitem representar validade temporal. `CURRENT` é metadata declarada, não uma garantia de atualização externa; uma fonte sem verificação recente deve ser marcada `POSSIBLY_STALE` ou `UNKNOWN` pelo fluxo responsável.

## Privacidade e auditoria

Logs guardam requester, purpose, IDs de conhecimento usados, decisão, operação e timestamp; não devem guardar chain-of-thought. Visibilidade e sensitivity são avaliadas separadamente de provenance. Preferências, eventos de Experience, memória episódica e Policy mantêm seus próprios contratos e não são convertidos em conhecimento público por compartilharem uma fonte.

## Lacunas explícitas

O contrato é flexível e não exige atualmente provenance completo em todas as gravações; `sourceType` é string aberta. A integridade referencial entre `derivedFromIds`, Vault sources, chunks, artifacts e relações ainda depende do produtor. Uma evolução deve validar referências sem apagar versões históricas nem impedir importações incompletas que sejam explicitamente marcadas como `UNKNOWN`.
