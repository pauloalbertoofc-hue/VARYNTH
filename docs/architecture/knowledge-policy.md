# Knowledge Policy

A decisão considera requester, purpose, domínio, projeto, visibility e sensitivity.

O `DomainRegistry` persiste policy por domínio: `publicKnowledge`, `allowedVisibility`, sensibilidade e consumidores autorizados. A policy efetiva de um subdomínio é uma interseção: não pode ampliar visibility ou consumidores bloqueados por ancestrais, nem reduzir a sensibilidade herdada. A policy controla conteúdo `DOMAIN`, `CROSS_DOMAIN` e `PUBLIC_TO_AGENTS`; descoberta do mapa continua independente da leitura. Capabilities podem permanecer declaradas, mas deixam de ser publicadas no índice se policy, visibility ou sensibilidade não as autorizarem.

`PRIVATE` não é publicado. `SENSITIVE` só pode ser lido no domínio, em projeto autorizado ou pelo owner de um item `AGENT_PRIVATE`; `SYSTEM`, `PUBLIC_TO_AGENTS` e `CROSS_DOMAIN` não ampliam esse acesso. Um item `AGENT_PRIVATE` é legível integralmente pelo próprio ownerAgent; outros agentes recebem DENY. Metadata discovery não altera a decisão de leitura.

Resultados possíveis:

- `ALLOW`;
- `DENY`;
- `ALLOW_SUMMARY`;
- `ALLOW_PUBLIC_ONLY`;
- `REQUIRE_DELEGATION`.

O enforcement fica no serviço, não na UI. Awareness global não equivale a acesso irrestrito.

Lifecycle também participa da decisão no serviço: `DRAFT`/`REVIEW` só aparecem para o owner; `ARCHIVED`/`DEPRECATED` não entram em retrieval nem discovery; `STALE` permanece acessível, mas perde prioridade frente a conteúdo atual. Só `ACTIVE` pode ser publicado entre agentes. A interface administrativa não substitui essas regras.
