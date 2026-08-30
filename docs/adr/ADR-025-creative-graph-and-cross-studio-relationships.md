# ADR-025: Grafo Criativo Unificado e Relações Cross-Studio

## Status
Aceito

## Contexto
Com os seis Studios implementados (Document, Web, Image, Audio, Video, Game), havia o risco de formarem silos isolados. Era necessário um grafo relacional que representasse dependências de projeto, semântica de proveniência e hierarquia de criação sem duplicar armazenamento físico.

## Decisão
1. **Grafo Único e Fonte Única de Verdade**: As relações são armazenadas nos `Artifact.relationships` e indexadas pelo `CreativeGraphEngine` com índice reverso reconstruível (`targetArtifactId -> consumer relationships`).
2. **Vocabulário Normalizado**: Conjunto canônico de tipos estruturais (`DERIVED_FROM`, `DEPENDS_ON`, `USES`, `REFERENCES`, `GENERATED_FROM`, `DESCRIBES`, `IMPLEMENTS`, `CONTAINS`, `PRODUCES`) combinado a um atributo opcional `semanticRole`.
3. **Regras de Ciclo Diferenciadas**: Relações causais/históricas (`DERIVED_FROM`, `GENERATED_FROM`, `PRODUCES`) são estritamente acíclicas (DAG), enquanto referências conceituais (`REFERENCES`, `RELATED_TO`) permitem ciclos bidirecionais.

## Consequências
- A Athena e os Studios podem rastrear árvores completas de proveniência e dependentes reversos.
- Ciclos causais impossíveis são prevenidos em tempo de compilação/linkagem.

