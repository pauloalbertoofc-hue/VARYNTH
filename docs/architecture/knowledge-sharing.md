# Knowledge Sharing

Conhecimento público entre agentes é explícito e mínimo. `PUBLIC_TO_AGENTS` permite contexto autorizado, mas não libera histórico, preferências pessoais ou projetos privados.

Uma capability registrada no domínio não é automaticamente pública. Somente `publicCapabilities` com descrição, entradas, saídas e consumidores explícitos aparece no catálogo de compartilhamento. Contratos são individuais por capability; um contrato `*` declara intencionalmente disponibilidade para todos os agentes, não leitura irrestrita do Vault. Snapshots antigos recebem os contratos revisados padrão apenas quando o campo ainda não existia; `publicCapabilities: []` é uma revogação explícita.

O catálogo atual anuncia interfaces de conhecimento; ele não é, por si só, um executor genérico dessas capabilities. A consulta ao conteúdo continua passando pelo Knowledge Policy e pelo serviço de retrieval.

O fluxo é:

`requester → policy → retrieval → KnowledgePacket → DomainResponse`

Packets carregam facts, provenance, constraints e purpose. Não carregam conversa integral nem chain-of-thought. Consultas são registradas no `knowledge_access_logs`.
