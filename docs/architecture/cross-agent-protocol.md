# Cross-Agent Protocol

Agentes descobrem apenas capabilities explicitamente publicadas em `DomainDefinition.publicCapabilities`. O registro comum `capabilities` informa awareness interna e não publica automaticamente uma operação. Cada contrato publicado declara provider resolvido pelo owner atual, domínio, entradas, saídas, finalidade pública e consumidores permitidos.

`DomainRegistry` resolve o especialista e o catálogo público; `decomposeKnowledgeTask` identifica domínio primário, domínios relacionados e capabilities; `requestKnowledgePacket` aplica retrieval e policy; `requestDomainResponse` produz uma resposta limitada e rastreável ao conteúdo autorizado. O provider precisa estar registrado no domínio e o log de acesso grava requester, provider, purpose e exatamente os IDs transferidos no pacote. O catálogo é de descoberta, não uma garantia de que exista um executor de capability para toda entrada.

Consultas simples podem usar capabilities públicas. Tarefas sensíveis permanecem sujeitas à delegação e às permissões do serviço.
