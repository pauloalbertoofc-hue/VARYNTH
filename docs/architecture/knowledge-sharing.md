# Knowledge Sharing

Conhecimento público entre agentes é explícito e mínimo. `PUBLIC_TO_AGENTS` permite contexto autorizado, mas não libera histórico, preferências pessoais ou projetos privados.

O fluxo é:

`requester → policy → retrieval → KnowledgePacket → DomainResponse`

Packets carregam facts, provenance, constraints e purpose. Não carregam conversa integral nem chain-of-thought. Consultas são registradas no `knowledge_access_logs`.
