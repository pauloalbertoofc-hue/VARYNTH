# Domain Ownership

Ownership é responsabilidade primária de curadoria, interpretação e manutenção; não é exclusividade nem segredo automático.

O `DomainRegistry` resolve owners e especialistas por domínio hierárquico. Athena conhece o mapa, mas o conteúdo continua sujeito à policy. Um agente removido não implica apagar o conhecimento do domínio.

## Contrato

- `primaryOwner`: especialista preferencial;
- `coOwners`: agentes com responsabilidade compartilhada explícita; continuam distintos do owner primário;
- `specialists`: agentes secundários;
- `routingTerms` / `routingPriority`: sinais declarativos para o DomainRouter, editáveis pelo owner e sem vínculo a agente específico;
- `capabilities`: operações públicas declaradas;
- `relatedDomains`: fronteiras interdisciplinares;
- `enabled`: disponibilidade do domínio.

## Persistência e transferência

O owner pode transferir ownership pela tela `/modules/knowledge`. A operação registra o owner anterior em `ownershipHistory`, remove seu acesso implícito como especialista e mantém os demais especialistas e co-owners. Owners e co-owners são incluídos na resolução de especialistas e podem consultar conhecimento `DOMAIN`; somente o owner primário permanece como autoridade preferencial para roteamento e capability-provider implícito. Co-owners podem ser adicionados/removidos separadamente pela interface autenticada de administração. A gravação é versionada por `revision` para rejeitar formulários obsoletos.

O snapshot autoritativo usa Redis/Upstash em hospedagem quando configurado e `.varynth-data/domain-registry.json` no servidor local; no browser, `localStorage` mantém um cache offline da última configuração. Sem backend persistente na Vercel, a interface fica somente de leitura e não confirma transferências.
