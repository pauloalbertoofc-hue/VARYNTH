# Cross-Agent Protocol

Agentes consultam capabilities públicas e recebem apenas o pacote necessário para a tarefa.

`DomainRegistry` resolve o especialista; `decomposeKnowledgeTask` identifica domínio primário, domínios relacionados e capabilities; `requestKnowledgePacket` aplica retrieval e policy; `requestDomainResponse` produz uma resposta limitada e rastreável.

Consultas simples podem usar capabilities públicas. Tarefas sensíveis permanecem sujeitas à delegação e às permissões do serviço.
