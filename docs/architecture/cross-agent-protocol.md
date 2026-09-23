# Cross-Agent Protocol

Agentes descobrem apenas capabilities explicitamente publicadas em `DomainDefinition.publicCapabilities`. O registro comum `capabilities` informa awareness interna e não publica automaticamente uma operação. Cada contrato publicado declara provider resolvido pelo owner atual, domínio, entradas, saídas, finalidade pública e consumidores permitidos.

`DomainRegistry` resolve o especialista e o catálogo público; `decomposeKnowledgeTask` identifica domínio primário, domínios relacionados e capabilities; `requestKnowledgePacket` aplica retrieval e policy; `askSpecialist` chama o método de consulta explícito do owner registrado apenas quando há fontes autorizadas. O provider precisa estar registrado no domínio e o log de acesso grava requester, provider, purpose e exatamente os IDs transferidos no pacote. Pacotes limitam fatos e tamanho; agentes sem método de consulta não recebem fallback que finja especialização. O catálogo é de descoberta, não uma garantia de que exista um executor para toda capability.

Consultas simples podem usar capabilities públicas. Tarefas sensíveis permanecem sujeitas à delegação e às permissões do serviço.
