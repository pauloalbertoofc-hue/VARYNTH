# ADR-044 — Domain Knowledge Layer

## Status

Aceito e implementado incrementalmente.

## Decisões

1. Usar `DomainRegistry` para ownership e capabilities, sem if/else espalhado por agente.
2. Persistir `KnowledgeItem` sobre o adaptador local existente.
3. Aplicar policy no serviço e usar least privilege.
4. Transferir contexto por `KnowledgePacket` e `DomainResponse`, não por conversa integral.
5. Preservar provenance, versões, conflitos e revogações.
6. Adiar graph database e embeddings como fonte de verdade até existir justificativa mensurável.

7. Dar a Athena um índice compacto de awareness (domínios, owners, especialistas e capabilities) sem carregar o conteúdo do Vault por padrão.
8. Tratar `PUBLIC_TO_AGENTS` como concessão explícita; domínio, projeto, agente, sensibilidade e operação continuam sujeitos à policy de menor privilégio.
9. Transferir conhecimento entre agentes em `KnowledgePacket`/`DomainResponse` com purpose e provenance, não em transcrições integrais.
10. Separar Knowledge, Experience, Preference, Memory e Policy, com precedência de instruções/policy sobre personalização.
11. Manter retrieval híbrido por filtros estruturados e busca lexical antes de considerar embeddings; nenhum índice semântico substitui a fonte de verdade local.

## Rationale

- **Ownership é responsabilidade, não exclusividade:** especialistas curam e interpretam seu domínio; conhecimento explicitamente público pode ser útil sem delegação completa.
- **Awareness não é posse:** Athena precisa localizar especialistas e coleções sem replicar documentos em todo contexto, reduzindo exposição e custo de contexto.
- **Pacotes substituem cópia de conversa:** o destinatário recebe apenas fatos autorizados, limites e origem necessários à tarefa, sem chain-of-thought.
- **Provenance sustenta confiança e revisão:** fonte, autoridade, assertion, versão e validade são visíveis e não se confundem com certeza.
- **Graph DB e embeddings são adiados:** as relações atuais cabem no modelo estruturado e armazenamento local; infraestrutura adicional exige necessidade e medição reais.
- **Agentes não consultam storage diretamente:** APIs de serviço centralizam policy, cache, versionamento e auditabilidade.
- **Least privilege também vale para Athena:** saber que um item existe não concede leitura; consultas externas autenticadas não podem declarar outro agente como requester.
- **Conhecimento difere de experiência:** fatos de domínio não devem ser confundidos com lições de execução, preferências do usuário ou estado de conversa.

## Consequências

Agentes podem compartilhar conhecimento público sem perder autoridade; conteúdo privado permanece isolado; Athena conhece o mapa sem carregar todo o Vault.

O contrato atual cobre o caminho central de Knowledge e vários limites de acesso, versionamento e provenance, mas não prova todos os marcos da especificação. O `DomainRegistry` agora tem persistência de servidor local/Redis e cache local no browser, mas precisa de validação de produção e de concorrência multi-instância; a taxonomia hierárquica ainda não está sincronizada ao Vault e chunks não têm proveniência granular. Os documentos `VAULT-TAXONOMY.md` e `provenance.md` registram esses limites sem declarar a arquitetura concluída.
