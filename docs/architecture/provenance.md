# Provenance de conhecimento

## Finalidade

Provenance permite responder de onde veio um item, quem o registrou, quando foi observado, qual autoridade foi atribuída à fonte e quais itens originaram um derivado. Autoridade ajuda a ordenar e apresentar fontes; nunca converte uma fonte em verdade automática.

## Contrato atual

`KnowledgeProvenance` contém `sourceType`, `sourceReference`, `addedBy`, `agentId`, `createdAt`, `observedAt`, `derivedFromIds`, `authority` e `inferred`. `KnowledgeItem` acrescenta domínio, owner, contribuidores, visibilidade, sensibilidade, tipo/assertion, versão, validade temporal, estado de freshness, projetos e artifacts relacionados.

Os valores de authority incluem `PRIMARY_SOURCE`, `OFFICIAL_REFERENCE`, `USER_PROVIDED`, `INTERNAL_DOCUMENT`, `AGENT_GENERATED`, `EXPERIENCE_DERIVED` e `UNKNOWN`. Assertion separa `FACT`, `INTERPRETATION`, `OPINION`, `HYPOTHESIS`, `PROCEDURE` e `REFERENCE`. São metadados epistêmicos, não uma validação automática do conteúdo.

## Vault, derivados e versões

O adaptador do Vault usa `sourceType: VAULT_ITEM` e aponta `sourceReference` para um identificador namespaced (`vault-storage:…`, URL ou `vault-item:…`), conforme disponível. `observedAt` e `updatedAt` refletem o instante persistido no Vault, não o momento da projeção no Knowledge. A projeção é serializada e idempotente por item; alterações reais atualizam a versão sem trocar a data original de criação ou a origem. Classificação explicitamente escolhida prevalece sobre inferência; escolhas humanas genéricas não são reclassificadas por heurística. Conteúdo textual indexável é adicionalmente dividido em chunks sobrepostos; cada chunk guarda `sourceId`, referência original, offsets em pontos de código Unicode, SHA-256 do texto e `derivedFromIds`, além da aresta `DERIVED_FROM` para a fonte. A fonte canônica permanece intacta. Arquivos sem texto extraído não geram chunks nem alegam posição física de página.

Na sincronização remota, o cliente envia os campos do `VaultItem`; o servidor reconstrói a projeção e define visibilidade, sensibilidade e provenance canonicamente. Alterações de metadados de projeções/chunks com conteúdo textual idêntico passam por `storeKnowledgeProjection`: preservam versão e snapshot de conteúdo, mas invalidam o índice e cache de retrieval antes da próxima consulta. Alterações do conteúdo seguem o versionamento normal. A persistência de conteúdo das APIs é isolada por conta e armazenada em Redis quando configurado; no desenvolvimento local usa arquivo por conta. Operações Redis mantêm lease renovável por conta e a gravação do snapshot compara atomicamente o token proprietário; uma instância cujo lease foi perdido falha fechada e não sobrescreve o estado de outra. A persistência ainda serializa operações em um repositório legado por processo e grava snapshots integrais por conta, portanto não representa ainda um teste real de throughput multi-instância. Na Vercel sem Redis, a API falha fechada e a interface mantém a cópia local do Vault/Knowledge, sem alegar persistência remota.

Atualizar um item preserva `createdAt`, incrementa `version`, grava um snapshot imutável com ID `<item>::version:<n>` e aponta `supersedesId` para esse snapshot. Os snapshots formam uma cadeia auditável, mas retrieval e discovery expõem apenas a versão corrente. Escritas do mesmo item são serializadas no processo e, em browsers com Web Locks, entre abas da mesma origem. Conflitos de fontes são agrupados sem sobrescrita silenciosa. Revogação marca `invalidatedAt`; itens revogados e descendentes alcançáveis por relações `DERIVED_FROM` deixam de entrar em retrieval, mantendo item e relações para auditoria. A restauração de um Vault item pode reprojetar a fonte atual como uma nova versão ativa.

`validFrom`, `validUntil`, `observedAt` e `freshness` permitem representar validade temporal. `CURRENT` é metadata declarada, não uma garantia de atualização externa; uma fonte sem verificação recente deve ser marcada `POSSIBLY_STALE` ou `UNKNOWN` pelo fluxo responsável.

## Privacidade e auditoria

Logs guardam requester, purpose, IDs de conhecimento usados, decisão, operação e timestamp; não devem guardar chain-of-thought. Visibilidade e sensitivity são avaliadas separadamente de provenance. Preferências, eventos de Experience, memória episódica e Policy mantêm seus próprios contratos e não são convertidos em conhecimento público por compartilharem uma fonte.

## Lacunas explícitas

O contrato continua flexível para importações legadas e `sourceType` é string aberta. Novas arestas `DERIVED_FROM` exigem endpoints Knowledge existentes e ativos; o restante dos `derivedFromIds` legado/importado ainda não é universalmente validado. Offsets apontam para o texto indexado exato e não equivalem a página física em PDF. Relações históricas são preservadas para auditoria quando um chunk é revogado.
