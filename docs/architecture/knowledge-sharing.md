# Knowledge Sharing

Conhecimento público entre agentes é explícito e mínimo. `PUBLIC_TO_AGENTS` permite contexto autorizado, mas não libera histórico, preferências pessoais ou projetos privados.

Uma capability registrada no domínio não é automaticamente pública. Somente `publicCapabilities` com descrição, entradas, saídas e consumidores explícitos aparece no catálogo de compartilhamento. Contratos são individuais por capability; um contrato `*` declara intencionalmente disponibilidade para todos os agentes, não leitura irrestrita do Vault. Snapshots antigos recebem os contratos revisados padrão apenas quando o campo ainda não existia; `publicCapabilities: []` é uma revogação explícita.

O catálogo atual anuncia interfaces de conhecimento; ele não é, por si só, um executor genérico dessas capabilities. A consulta ao conteúdo continua passando pelo Knowledge Policy e pelo serviço de retrieval.

`askSpecialist` só invoca o owner registrado se ele declarar `consultKnowledge` e se o pacote contiver ao menos uma fonte autorizada. O método recebe exclusivamente fatos do pacote (máximo de oito, até mil caracteres por fato), sem contexto ambiente da conta. Cada fato preserva referência de origem, linhagem e, para texto segmentado, offsets Unicode e SHA-256 exatos do texto efetivamente entregue, inclusive após truncamento. Hoje Euterpe e Justitia fazem revisão determinística das fontes; não se declara raciocínio neural, análise de áudio ou parecer jurídico nessa rota. Agentes sem esse método não recebem resposta substituta que simule especialização.

O fluxo é:

`requester → policy → retrieval → KnowledgePacket → DomainResponse`

Packets carregam facts, provenance, constraints e purpose. Não carregam conversa integral nem chain-of-thought. Consultas são registradas no `knowledge_access_logs`.
