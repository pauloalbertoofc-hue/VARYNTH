# Domain Ownership

Ownership é responsabilidade primária de curadoria, interpretação e manutenção; não é exclusividade nem segredo automático.

O `DomainRegistry` resolve owners e especialistas por domínio hierárquico. Athena conhece o mapa, mas o conteúdo continua sujeito à policy. Um agente removido não implica apagar o conhecimento do domínio.

## Contrato

- `primaryOwner`: especialista preferencial;
- `specialists`: agentes secundários;
- `capabilities`: operações públicas declaradas;
- `relatedDomains`: fronteiras interdisciplinares;
- `enabled`: disponibilidade do domínio.

## Persistência e transferência

O owner pode transferir ownership pela tela `/modules/knowledge`. A operação registra o owner anterior em `ownershipHistory`, remove seu acesso implícito como especialista e mantém os demais especialistas. A gravação é versionada por `revision` para rejeitar formulários obsoletos.

O snapshot autoritativo usa Redis/Upstash em hospedagem quando configurado e `.varynth-data/domain-registry.json` no servidor local; no browser, `localStorage` mantém um cache offline da última configuração. Sem backend persistente na Vercel, a interface fica somente de leitura e não confirma transferências.
