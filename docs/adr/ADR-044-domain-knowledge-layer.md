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

## Consequências

Agentes podem compartilhar conhecimento público sem perder autoridade; conteúdo privado permanece isolado; Athena conhece o mapa sem carregar todo o Vault.
