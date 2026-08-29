# ADR-003 — Roteamento em Três Vias de Interação (Fast, Cognitive & Operational)

## Status
**Accepted**

## Contexto
Anteriormente, o sistema tentava tratar todas as mensagens do usuário através de um único funil monolítico. Isso gerava dois erros críticos:
1. Mensagens sociais simples (*"como você está?"*) acionavam ferramentas pesadas e despejavam relatórios do sistema inteiro.
2. Pedidos cognitivos compostos (*"me dê ideias e recomende um projeto"*) que não casavam com palavras-chave rígidas caíam em fallbacks evasivos.

## Decisão
Dividir o fluxo de processamento da Athena em 3 vias distintas antes de qualquer deliberação ou execução:
1. **`CONVERSATION` (Fast Path)**: Diálogo social, humor e empatia — 0 ms, zero queries a banco de dados.
2. **`COGNITIVE_REQUEST` (Cognitive Path)**: Ideação, recomendações, comparações, análises e críticas com o Conselho de Agentes e resposta direta.
3. **`OPERATIONAL_REQUEST` (Operational Path)**: Mutações seguras no sistema via Action Layer e Audit Trail.

## Consequências
- **Ganhos**: Fim definitivo do despejo de dados em conversas sociais e capacidade de compor múltiplas intenções cognitivas em uma mesma frase.

