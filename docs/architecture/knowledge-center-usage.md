# Knowledge Center — uso real

Abra `VARYNTH → Apps → Knowledge` ou `/modules/knowledge`.

## Consultar

Use a busca textual e o filtro de domínio. O resultado passa por `queryKnowledge`, visibility e policy; itens privados ou fora do projeto não aparecem apenas porque foram encontrados localmente.

## Interpretar o mapa

O Domain Registry mostra owner, especialistas, capabilities públicas e domínios relacionados. Esse mapa é awareness da Athena, não autorização para ler conteúdo.

## Diagnóstico

O painel mostra Knowledge Items, grupos de conflitos e quantidade de consultas auditadas. Fontes divergentes permanecem agrupadas para revisão; revogação remove o item do retrieval sem eliminar provenance.

## Caminhos de serviço

- `GET /api/knowledge/domains` — mapa autenticado;
- `GET /api/knowledge/capabilities` — capabilities públicas autenticadas;
- `POST /api/knowledge/route` — decomposição multidomínio autenticada.
- `GET/POST /api/knowledge/items` — estado de persistência da conta e sincronização/revogação de projeções do Vault.
- `POST /api/knowledge/response` — DomainResponse autenticado com evidence e limitations.

O Vault continua sendo a origem de arquivos e classificação do usuário. A conversão para KnowledgeItem é derivada e preserva a referência de origem.

As rotas de conteúdo carregam e salvam Knowledge no escopo da conta autenticada. Redis é necessário para persistência remota na Vercel; sem ele, as rotas falham fechadas e Knowledge continua disponível apenas na persistência local do navegador. O centro exibe o modo reportado pela API para não confundir armazenamento local com sincronização remota.
