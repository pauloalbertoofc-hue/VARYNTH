# ADR-004 — Política Anti-Fallback Genérico, Resposta Direta & Validação de Completude

## Status
**Accepted**

## Contexto
Em versões preliminares, quando uma frase não encontrava uma regra pré-programada, o sistema emitia frases de preenchimento como *"Entendi perfeitamente, Paulo. Estou acompanhando sua linha de raciocínio. Como você gostaria de encaminhar essa reflexão agora?"*. Esse comportamento fingia compreensão sem entregar a resposta solicitada pelo usuário.

## Decisão
1. **Extirpação de Frases Evasivas**: Eliminar permanentemente qualquer frase de acompanhamento vazia usada como substituto de resposta.
2. **Princípio de Resposta Direta**: Se o usuário pediu ideias ou recomendações, a Athena **responde primeiro com as ideias concretas**, formulando perguntas secundárias apenas ao final.
3. **ResponseCompletenessValidator**: Validar ativamente se todos os aspectos solicitados (ex: ideias + recomendação) estão presentes no texto gerado antes do envio.
4. **Política de Honestidade**: Se a confiança for baixa, admitir abertamente a limitação em vez de fingir inteligência.

## Consequências
- **Ganhos**: Conversação substantiva, autoridade intelectual e eliminação de respostas frustrantes.

