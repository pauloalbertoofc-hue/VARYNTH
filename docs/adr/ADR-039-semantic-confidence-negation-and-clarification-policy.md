# ADR-039: Semantic Confidence, Negation & Clarification Policy

## Status
ACCEPTED

## Contexto
O processamento de linguagem natural no VARYNTH OS precisa lidar de forma segura com negações complexas, sarcasmo reverso, desabafos emocionais e entradas com ruído, garantindo que o sistema pergunte honestamente quando tiver dúvidas em vez de alucinar ou acionar mutações indevidas.

## Decisão
1. **Negação com Escopo (`NegationAnalyzer`)**:
   - Veto Primário: proibições explícitas (*"Não crie a tarefa"*) bloqueiam incondicionalmente ações operacionais.
   - Negação com Escopo: distingue permissão de ação de permissão de publicação (*"Crie o vídeo, mas não publique"* -> `action: allowed, publish: denied`).
   - Negação de Sentimento vs Ação: preserva nova ação solicitada após crítica (*"Não gostei do título; faça outro"* -> nova ação afirmativa).
2. **Pragmática e Sarcasmo Seguro (`PragmaticsAnalyzer`)**:
   - Feedback sarcástico (*"Perfeito, era exatamente isso que eu não queria"*) é classificado como diálogo/rejeição, nunca como aprovação de ação.
   - Desabafos emocionais (*"Esse projeto está me deixando maluco"*) recebem empatia no Fast Path sem mutações no banco de dados.
3. **Detecção de Ruído e Incerteza Explícita (`NoiseDetector`)**:
   - Tokens alfanuméricos aleatórios (*"xyz987abc?"*) são classificados como `UNKNOWN_INPUT`, gerando pedido polido de esclarecimento em vez de dissertações acadêmicas fabricadas.
   - Identificadores técnicos legítimos (hashes Git `bfdf792`, `ADR-039`, `HC123456`, `IMGST-REG-030`, citações jurídicas) são preservados de falsos positivos.

## Consequências
- Invariantes `INV-039` (Proteção contra baixa confiança em ações destrutivas) e `INV-040` (Rejeição de Ruído) formalizadas.
- 100% de precisão nos cenários de pragmática e autoridade na suíte comportamental `ATHINT`.

