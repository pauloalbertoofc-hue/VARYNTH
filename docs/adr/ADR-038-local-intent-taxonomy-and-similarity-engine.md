# ADR-038: Local Intent Taxonomy & Similarity Engine

## Status
ACCEPTED

## Contexto
O modelo anterior de correspondência heurística dependia de dezenas de `clean.includes()`, que se tornavam frágeis ao menor desvio sintático. Era necessário um modelo estatístico determinístico que generalizasse paráfrases sem exigir memória excessiva ou latência perceptível.

## Decisão
1. **Taxonomia Canônica Estruturada (`AthenaCanonicalIntent`)**:
   - 16 intenções canônicas bem delimitadas alimentadas por corpus de desenvolvimento categorizado (canônico, formal, coloquial, curto, indireto, polido).
2. **Motor de Similaridade Local Estatístico (`LocalSimilarityEngine`)**:
   - Extrai unigramas, bigramas de palavras e trigramas de caracteres (para resiliência morfológica a plurais e conjugações).
   - Vetorização ponderada por TF-IDF com cálculo de similaridade por cosseno em memória (< 1ms por consulta).
3. **Métrica de Margem e Detecção de Ambiguidade**:
   - Calcula a margem $\Delta = \text{top1} - \text{top2}$. Se a margem for estreita em pontuações médias, sinaliza ambiguidade semântica para desambiguação contextual em vez de adivinhação.

## Consequências
- Paráfrases coloquiais como *"Tem coisa pendente?"*, *"O que ficou pra fazer?"* e *"Estou devendo alguma coisa?"* mapeiam confiavelmente para `TASK_QUERY`.
- Generalização comprovada no conjunto holdout cego (`SEM-REG-021`, `SEM-REG-030`).

