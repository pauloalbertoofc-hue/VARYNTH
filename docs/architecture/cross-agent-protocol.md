# Cross-Agent Protocol

Agentes descobrem apenas capabilities explicitamente publicadas em `DomainDefinition.publicCapabilities`. O registro comum `capabilities` informa awareness interna e não publica automaticamente uma operação. Cada contrato publicado declara provider resolvido pelo owner atual, domínio, entradas, saídas, finalidade pública e consumidores permitidos.

`DomainRegistry` resolve o especialista e o catálogo público; `decomposeKnowledgeTask` identifica domínio primário, domínios relacionados e capabilities; `requestKnowledgePacket` aplica retrieval e policy; `askSpecialist` chama o método de consulta explícito do owner registrado apenas quando há fontes autorizadas. O provider precisa estar registrado no domínio e o log de acesso grava requester, provider, purpose e exatamente os IDs transferidos no pacote. Pacotes limitam fatos e tamanho; agentes sem método de consulta não recebem fallback que finja especialização. O catálogo é de descoberta, não uma garantia de que exista um executor para toda capability.

Consultas simples podem usar capabilities públicas. Tarefas sensíveis permanecem sujeitas à delegação e às permissões do serviço.

## Identidade de conversa

Athena é a interlocutora única no Hub, Sidecar e em tarefas delegadas: especialistas retornam achados, evidências, confiança e limitações sem inserir uma apresentação em primeira pessoa no texto dirigido ao usuário. Uma superfície nativa de especialista, como Euterpe dentro do Music, pode preservar sua voz própria. `AthenaContext.responseAudience` explicita essa diferença; o helper de invocação usado por Athena marca `ATHENA`, enquanto consumidores nativos mantêm `SPECIALIST` por padrão. A audiência afeta apenas apresentação, nunca seleção, escopo de evidência ou autoridade.
