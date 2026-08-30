# ADR-032: Modelo de Plano Criativo e Grafo de Execução DAG

## Status
Accepted

## Data
2026-08-29

## Contexto
A Athena precisa transformar intenções amplas do usuário (ex: "Transforme este artigo em site, capa, áudio e vídeo") em estruturas computáveis, inspecionáveis e acíclicas antes de qualquer execução física.

## Decisão
1. Formalizar a separação entre `CreativeIntent`, `CreativePlan` (declaração de intenção) e `CreativeExecutionPlan` (plano concreto derivado).
2. Utilizar Grafos Direcionados Acíclicos (DAG) validados com detecção de ciclos (`PLAN_CYCLE_DETECTED`).
3. Calcular `planHash` canônico e determinístico ignorando campos voláteis de apresentação para proteção anti-TOCTOU.

## Consequências
- **Ganhos**: Decomposição transparente, inspeção prévia pelo usuário e ordenação topológica determinística.
- **Trade-offs**: Custo computacional leve de validação de grafo antes da emissão do plano.

