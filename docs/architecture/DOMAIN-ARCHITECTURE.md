# VARYNTH Domain Architecture

Conhecimento pertence a domínios; agentes especializam-se neles; ownership significa responsabilidade, não isolamento.

O mapa compacto vive no `DomainRegistry`. A resolução hierárquica aceita subdomínios sem duplicar conhecimento, enquanto `DomainRouter` e `decomposeKnowledgeTask` identificam colaboração interdisciplinar.

O conjunto inicial inclui árvores de Music & Audio (teoria, harmonia, composição, produção, voz, sound design, game audio, tecnologia e provenance) e Legal (incluindo propriedade intelectual e privacidade). Seeds padrão são mescladas sob snapshots persistidos; valores persistidos prevalecem, de modo que adicionar nós no código não apaga ownership já configurado. Owners e capabilities podem ser herdados do domínio pai.

Athena mantém awareness global dos domínios e owners. O índice compacto inclui bridges semânticos e apenas contratos explicitamente publicados, com provider e consumidores permitidos; capabilities internas não são promovidas automaticamente. Isso é catálogo de descoberta, não promessa de executor nem autorização de leitura. Retrieval, policy e orçamento determinam o conteúdo que entra no contexto; o índice continua com `contentLoaded: false`.

Cada domínio também possui policy explícita de compartilhamento: elegibilidade pública, visibilities permitidas, sensibilidade e consumidores. A policy efetiva é herdada de modo restritivo: subdomínios não podem reabrir visibility, reduzir sensibilidade ou ampliar consumidores bloqueados pelos ancestrais. O owner configura essa policy no Centro de Conhecimento; capabilities continuam registradas, mas são omitidas do catálogo público até que a policy efetiva permita exposição.
