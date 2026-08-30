# ADR-028: Invariantes do Sistema e Política Fail-Closed

## Status
Aceito

## Contexto
O ecossistema criativo do VARYNTH OS integra seis Studios (Document, Web, Image, Audio, Video, Game) através de grafos de relacionamento e assets compartilhados. Para garantir que falhas locais, concorrência ou corrupção de arquivos não se propaguem silenciosamente, o sistema necessita de uma camada formal de invariantes com execução preventiva e determinística.

## Decisão
1. Definir 20 invariantes canônicas (`INV-001` .. `INV-020`) categorizadas por severidade (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
2. Adotar a política estrita de **Fail-Closed**: se qualquer invariante crítica falhar durante uma operação transacional, a operação é abortada imediatamente com rollback total para o snapshot seguro prévio.
3. Avaliar invariantes em pontos estratégicos do ciclo de vida: `STARTUP_RECOVERY`, `POST_TRANSACTION`, `PRE_BACKUP`, `POST_RESTORE` e `ON_DEMAND`.
4. O `SystemHealthReport` nunca reportará `HEALTHY` se houver falha em qualquer invariante crítica.

## Consequências
- **Positivas**: Previne mutações fantasmas, elimina corrupção silenciosa de dependências e garante conformidade absoluta com o Princípio Alex.
- **Trade-offs**: Operações com inconsistências estruturais são rejeitadas de forma explícita, exigindo revisão pelo usuário ou plano de reparo assistido.

