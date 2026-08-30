# ADR-036: Hybrid Local Semantic Interpretation Layer

## Status
ACCEPTED

## Contexto
A auditoria comportamental da Athena (ATHINT-001..100) demonstrou que a correspondência rígida de substrings e regex (`normalizeText()` -> `clean.includes()`) falhava diante de paráfrases coloquiais naturais em língua portuguesa (ex.: *"Tem coisa pendente?"*, *"O que ficou pra fazer?"*, *"Tô devendo alguma coisa?"*), caindo erroneamente no Fast Path social e emitindo saudações genéricas.

Era necessário introduzir uma camada semântica local híbrida entre a normalização linguística e o Decision Router sem violar o isolamento de autoridade e a filosofia Local-First.

## Decisão
1. **Camada de Interpretação Semântica Local Híbrida (`SemanticInterpretationEngine`)**:
   - Inserida após a resolução anafórica e deítica.
   - Executa a fusão em camadas:
     `Deterministic Safety Signals` -> `Pragmatic & Negation Analysis` -> `Local Similarity Engine (n-gram/cosseno)` -> `Optional Local Small LM` -> `Semantic Fusion` -> `Structured Interpretation`.
2. **Separação Rigorosa de Contratos**:
   - `LocalSimilarityEngine`: baseline estatístico n-gram TF-IDF com similaridade por cosseno sobre o corpus taxonômico canônico.
   - `LocalSemanticLMAdapter`: enriquecimento neural opcional via Ollama local sob schema JSON estrito, timeout configurável e Circuit Breaker formal (CLOSED, OPEN, HALF_OPEN).
3. **Imutabilidade da Autoridade**:
   - Modelos semânticos e neurais apenas interpretam significado e extraem slots estruturados (`SemanticCandidate`).
   - Nenhuma decisão semântica executa ferramentas, altera permissões ou ignora as políticas do `PermissionPolicyEngine`.

## Consequências
- A taxa de acerto na suíte comportamental cega `ATHINT-001..100` subiu de **87% para 96%** com zero falhas remanescentes.
- O sistema mantém 100% de funcionalidade quando o servidor Ollama está offline (`INV-041`).
- Sinais determinísticos de negação e segurança possuem veto incondicional sobre qualquer proposta neural (`INV-038`).
