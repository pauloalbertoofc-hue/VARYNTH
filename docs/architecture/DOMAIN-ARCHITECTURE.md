# VARYNTH Domain Architecture

Conhecimento pertence a domínios; agentes especializam-se neles; ownership significa responsabilidade, não isolamento.

O mapa compacto vive no `DomainRegistry`. A resolução hierárquica aceita subdomínios sem duplicar conhecimento, enquanto `DomainRouter` e `decomposeKnowledgeTask` identificam colaboração interdisciplinar.

O conjunto inicial inclui árvores de Music & Audio (teoria, harmonia, composição, produção, voz, sound design, game audio, tecnologia e provenance) e Legal (incluindo propriedade intelectual e privacidade). Seeds padrão são mescladas sob snapshots persistidos; valores persistidos prevalecem, de modo que adicionar nós no código não apaga ownership já configurado. Owners e capabilities podem ser herdados do domínio pai.

Athena mantém awareness global dos domínios e owners. Retrieval, policy e orçamento determinam o conteúdo que entra no contexto.
