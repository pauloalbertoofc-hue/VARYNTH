# ADR-001 — Soberania Tecnológica Local-First & Independência de APIs Comerciais

## Status
**Accepted** (Imutável)

## Contexto
Durante o planejamento inicial da inteligência cognitiva do VARYNTH OS (Athena), existia a opção de plugar SDKs de provedores comerciais de nuvem (OpenAI GPT-4, Google Gemini Pro, Anthropic Claude) para obter respostas conversacionais rápidas. No entanto, o VARYNTH OS destina-se a formulações jurídicas confidenciais, rascunhos de teses acadêmicas e anotações pessoais protegidas por sigilo profissional.

## Decisão
Decidiu-se que a Athena deve operar exclusivamente sob o princípio **Local-First**, sem dependência de chaves de API pagas ou envio de dados para terceiros. A inferência neural é suportada opcionalmente via instâncias locais do Ollama (`127.0.0.1:11434`), mantendo um baseline cognitivo determinístico de 0 ms e uma base epistêmica embutida para operar 100% offline.

## Justificativa
1. **Privacidade Absoluta**: Dados de pesquisa nunca saem da máquina do usuário.
2. **Independência Operacional**: O sistema funciona perfeitamente sem conexão com a internet.
3. **Sustentabilidade Financeira**: Custo operacional zero com faturamento recorrente de tokens.

## Alternativas Consideradas
- *Integração com OpenAI/Claude via Proxy*: Rejeitada devido ao risco de vazamento de dados e custos imprevisíveis.
- *LLMs obrigatórios em nuvem*: Rejeitada por violar o princípio de soberania do VARYNTH.

## Consequências
- **Ganhos**: Segurança de ponta a ponta, auditabilidade determinística, velocidade instantânea (0 ms no baseline).
- **Compromissos**: A inteligência depende da modelagem determinística dos agentes do Conselho ou da capacidade computacional da GPU/CPU local para rodar modelos locais leves.
