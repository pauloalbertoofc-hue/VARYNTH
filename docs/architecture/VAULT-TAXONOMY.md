# Vault Taxonomy

## Princípio

A classificação semântica do Vault não determina a localização física de um arquivo. Um item pode permanecer na coleção onde foi guardado e, ao mesmo tempo, ser relacionado a um ou mais domínios e projetos. A taxonomia descreve o conteúdo; storage, `storageId`, `storageUrl` e o nome original descrevem sua localização e identidade de origem.

## Metadados persistidos atualmente

`VaultItem` mantém tipo de item, categoria literária, tipo de obra, formato, assunto primário, tags, estado de leitura, origem, versão da taxonomia, origem/confiança da classificação e IDs de projetos relacionados. Os campos aditivos `knowledgeDomains`, `knowledgeCategories` e `knowledgeTags` persistem correções semânticas separadas da categoria editorial e das tags da fonte. A migração para `taxonomyVersion: 2` preserva os dados legados e marca sua classificação como `migration`; não equivale a uma revisão humana.

O classificador pode sugerir assunto e tags a partir de título, autoria, nome de arquivo e URL. Sugestões continuam distinguíveis de correções explícitas. A adaptação para `KnowledgeItem` só aplica inferência quando há um domínio não genérico reconhecível com confiança mínima de 0,8; classificação manual, aceita ou migrada é tratada como explícita, inclusive quando o usuário escolheu conhecimento geral. Confidence permanece metadata epistêmica, não autoridade da fonte nem prova factual.

## Relação com domínios

Sem correção semântica, o assunto primário do Vault é traduzido para um domínio canônico somente para os assuntos atualmente mapeados (`legal`, `philosophy`, `technology`, `history`, `psychology`, `science` e `music`). Tags com ponto ou referência a áudio podem ser transportadas como domínios relacionados. Uma revisão explícita no Knowledge Center persiste IDs hierárquicos e domínios relacionados em `knowledgeDomains` (primário primeiro), além de categorias/tags Knowledge próprias; ela não move o arquivo nem altera a categoria editorial legada.

O adaptador cria provenance `VAULT_ITEM`, preserva uma referência de origem namespaced e associa projetos. Itens ligados a projetos tornam-se `PROJECT`; os demais tornam-se `DOMAIN`. A projeção no Knowledge é serializada por ID, não incrementa versão quando nenhuma informação relevante mudou e preserva a provenance original em atualizações. Remover um item ativo do Vault revoga sua projeção e os derivados ligados por `DERIVED_FROM`; restaurá-lo reprojeta a fonte atual. O adaptador não infere que o conteúdo é público entre agentes.

## Limites atuais e evolução

- `category` permanece uma string legada; os campos de obra/formato/assunto são taxonomia editorial, não substituem os domínios de conhecimento.
- IDs semânticos corrigidos são persistidos no item; o Vault não cria automaticamente novos nós no `DomainRegistry`, portanto a interface de correção oferece os domínios registrados.
- A classificação sugerida usa regras estruturadas locais, não embeddings; casos ambíguos precisam permanecer não classificados ou ser corrigidos pelo usuário.
- A relação física multi-arquivo, localização de trecho/página e proveniência de chunks ainda não é expressa integralmente no adaptador.

Essas lacunas devem ser fechadas com migrações aditivas, mantendo o caminho original do arquivo e a classificação anterior como provenance.
