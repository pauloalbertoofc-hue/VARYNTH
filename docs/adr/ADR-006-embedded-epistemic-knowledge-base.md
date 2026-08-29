# ADR-006 — Base Epistêmica Embutida Offline para Filosofia, Direito e Ciência

## Status
**Accepted**

## Contexto
Dúvidas epistemológicas fundamentais (ex: *"O que é hermenêutica?"*, *"Qual a relevância do Latim no Direito?"*, *"O que define um jogo segundo Huizinga?"*) são frequentemente acionadas durante pesquisas acadêmicas. Em um ambiente Local-First sem internet, a Athena precisava responder a esses conceitos com rigor conceitual.

## Decisão
Embutir diretamente no código-fonte uma **Base Epistêmica Offline** (`src/lib/athena/knowledge/epistemic-concepts.ts`) contendo verbetes densos e estruturados sobre:
- Filosofia do Direito & Hermenêutica Jurídica.
- Teoria Geral dos Jogos (Johan Huizinga, Roger Caillois, John Nash).
- Método Científico & Falsificacionismo (Karl Popper).
- Epistemologia e Filosofia da Mente.
- Latim Forense & Expressões Jurídicas Fundamentais.

## Consequências
- **Ganhos**: Respostas conceituais instantâneas, profundas e consistentes, mesmo sem nenhum modelo de IA ativo.

