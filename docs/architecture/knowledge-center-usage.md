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
- `POST /api/knowledge/response` — DomainResponse autenticado com evidence e limitations.

O Vault continua sendo a origem de arquivos e classificação do usuário. A conversão para KnowledgeItem é derivada e preserva a referência de origem.
