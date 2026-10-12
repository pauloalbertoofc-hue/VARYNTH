# Segurança Conversacional, Anti-Evasão & Honestidade — Athena

## 1. Visão Geral
A Athena implementa um conjunto rigoroso de **Guardrails Conversacionais** e **Quality Gates** (`src/lib/athena/conversation/completeness-validator.ts` e `src/lib/athena/conversation/telemetry.ts`) para garantir que o assistente seja intelectualmente honesto, direto e confiável.

---

## 2. Política de Honestidade de Compreensão

```mermaid
flowchart TD
    Prompt[Entrada do Usuário] --> EvalConfidence[Avaliação de Confiança Semântica]
    
    EvalConfidence -- Confiança ALTA (HIGH) --> DirectAnswer[Responder Diretamente ao Pedido]
    EvalConfidence -- Confiança MÉDIA (MEDIUM) --> ProbableAnswer[Responder explicitando premissa adotada]
    EvalConfidence -- Confiança BAIXA (LOW) --> HonestClarification[Admitir incerteza e pedir esclarecimento direcionado]
    
    subgraph FORBIDDEN ["🚫 COMPORTAMENTO PROIBIDO"]
        FakeUnderstanding[Fingir compreensão com frases vazias: 'Entendi perfeitamente...']
    end
```

---

## 3. Validador de Completude da Resposta (`ResponseCompletenessValidator`)
Antes de liberar qualquer resposta de requisição cognitiva (`COGNITIVE_REQUEST`):
1. Se o usuário solicitou **Ideias** (`BRAINSTORM`), o validador confere se há propostas numeradas no texto.
2. Se o usuário solicitou **Recomendação** (`RECOMMEND`), confere se há indicação clara da melhor opção de início.
3. Se o usuário solicitou **Crítica** (`CRITIQUE`), confere se foram apontados riscos e pontos cegos.
4. Se o texto contiver frases de evasão ou tiver menos de 30 caracteres para uma análise densa, a resposta é reprovada e re-sintetizada.
5. Em pedidos compostos, pistas explícitas de entregáveis (por exemplo, documentação, testes, typecheck, build, publicação e GitHub) são conferidas também no resultado de especialistas. Se a análise especializada for válida, seu conteúdo é preservado e os itens não cobertos são nomeados como cobertura parcial; não se afirma que foram executados. Essa checagem lexical é uma salvaguarda de transparência, não uma prova de completude semântica.

Uma resposta parcial de especialista não é automaticamente rejeitada apenas por deixar etapas secundárias sem cobertura. Conflitos factuais, alegações de execução sem autorização, falha de execução e incompletude do núcleo cognitivo continuam sujeitos aos bloqueios existentes.

---

## 4. Telemetria Local de Falhas (`LocalFailureTelemetry`)
Qualquer evento de baixa confiança (`LOW_CONFIDENCE`), necessidade de esclarecimento (`CLARIFICATION_REQUIRED`) ou resposta incompleta (`INCOMPLETE_RESPONSE`) é registrado internamente em memória para depuração técnica offline, sem envio para servidores de terceiros.

