# 🏛️ Athena — Suíte Histórica de Regressão Conversacional & Memória Técnica de Falhas

Este documento registra todas as falhas conversacionais reais apresentadas pela Athena durante o desenvolvimento do **VARYNTH OS**, suas causas-raiz, correções estruturais e testes de regressão automatizados vinculados.

---

## 🎯 Princípios Fundamentais de Engenharia Conversacional

1. **Understand → Resolve Context → Decide → Respond/Act**: A ausência de comando de banco de dados não significa ausência de sentido.
2. **Princípio de Resposta Direta**: Responder primeiro ao que foi pedido com conteúdo relevante antes de qualquer desdobramento conversacional.
3. **Anti-Generic-Fallback Policy**: Extirpação permanente de frases evasivas como *"Entendi perfeitamente... como gostaria de encaminhar essa reflexão?"*.
4. **Resolução Contextual de Anáforas & Elipses**: Compreensão de respostas curtas multi-turno (*"o segundo"*, *"por quê?"*, *"critique essa ideia"*).
5. **Fail-Closed em Ações Destrutivas (Alex Principle)**: Alvos ambíguos em exclusão exigem confirmação explícita; exclusões são direcionadas para a lixeira com 10 dias de retenção e capacidade de Desfazer (*Undo*).

---

## 📂 Catálogo de Falhas Históricas & Casos de Regressão

### 📌 [ATH-CONV-001] Social Check-in vs Ecosystem Briefing
- **ID de Falha**: `ATH-FAIL-001`
- **Categoria**: `SOCIAL_MISREAD` / `OVER_TOOL_USAGE`
- **Sintoma**: Ao receber *"Como você está?"* ou *"Que novidade você tem?"*, a Athena despejava o briefing completo do sistema (Projetos: 3, Tarefas: 5, Prazos no Chronos, Obras no Vault).
- **Causa-Raiz**: O classificador interpretava qualquer pergunta de estado como solicitação de briefing geral do ecossistema do usuário.
- **Correção**: Separação estrita entre `SOCIAL_CONVERSATION` (Fast Path, zero banco de dados) e `ECOSYSTEM_STATUS` / `ECOSYSTEM_BRIEFING`.
- **Regra Criada**: Perguntas sociais dirigidas à persona da Athena devem receber resposta conversacional natural sem consultar banco de dados.
- **Teste de Regressão**: `ATH-CONV-001` (Golden Case)

---

### 📌 [ATH-CONV-002] Brainstorm & Recomendação Proativa de Projetos
- **ID de Falha**: `ATH-FAIL-002`
- **Categoria**: `GENERIC_FALLBACK` / `INCOMPLETE_RESPONSE`
- **Sintoma**: O usuário perguntou *"me dê ideias para hoje? que projeto que é interessante começar?"* e a Athena respondeu *"Entendi perfeitamente, Paulo. Estou acompanhando sua linha de raciocínio. Como você gostaria de encaminhar essa reflexão agora?"*.
- **Causa-Raiz**: A correspondência de string estrita não capturou a intenção composta (`BRAINSTORM` + `RECOMMEND`) com sujeito `PROJECT`, caindo no fallback genérico.
- **Correção**: Implementação de `COGNITIVE_REQUEST` com propostas ativas da especialista **Musa** e do estrategista **Strategos** (3 projetos estratégicos no Labs/Codex/Vault).
- **Regra Criada**: Pedidos de ideação e recomendação devem entregar propostas concretas imediatamente.
- **Teste de Regressão**: `ATH-CONV-002` (Golden Case)

---

### 📌 [ATH-CONV-003] Exclusão Segura com Lixeira de 10 Dias e Alex Principle
- **ID de Falha**: `ATH-FAIL-003`
- **Categoria**: `DESTRUCTIVE_ACTION_AMBIGUITY` / `OPERATIONAL_MISREAD`
- **Sintoma**: Risco de exclusão imediata e permanente de itens quando o usuário pedia exclusão.
- **Causa-Raiz**: Ausência de camada intermediária de retenção temporal com Undo.
- **Correção**: Integração do módulo Trash com retenção de 10 dias, suporte a Desfazer e exigência de confirmação quando o alvo for ambíguo.
- **Regra Criada**: Nenhuma exclusão é permanente no ato. Alvos ambíguos ativam bloqueio *Fail-Closed*.
- **Teste de Regressão**: `ATH-CONV-003` (Golden Case)

---

### 📌 [ATH-CONV-004] Resolução de Elipse e Pronome ("o segundo")
- **ID de Falha**: `ATH-FAIL-004`
- **Categoria**: `PRONOUN_RESOLUTION` / `CONTEXT_LOSS`
- **Sintoma**: Usuário discutia *"Estou entre o VARYNTH e a pesquisa CNJ"* e em seguida perguntava *"E o segundo?"*. A Athena não resolvia a anáfora e pedia repetição do projeto.
- **Causa-Raiz**: Falta de rastreamento de histórico de entidades recentes na sessão.
- **Correção**: Resolução de anáforas e elipses no `ConversationManager` com inspeção de `recentEntities`.
- **Regra Criada**: Respostas curtas dependentes do contexto devem ser resolvidas contra entidades ativas no diálogo.
- **Teste de Regressão**: `ATH-CONV-004` (Golden Case)

---

### 📌 [ATH-CONV-005] Follow-up Contextual da Justificativa ("Por quê?")
- **ID de Falha**: `ATH-FAIL-005`
- **Categoria**: `FOLLOW_UP_FAILURE` / `FALSE_UNDERSTANDING`
- **Sintoma**: Ao perguntar *"Por quê?"* após a Athena recomendar um projeto, a Athena devolvia pergunta genérica ou não explicava a recomendação.
- **Causa-Raiz**: Falta de persistência das recomendações do turno anterior na memória conversacional.
- **Correção**: `recentRecommendations` registradas em `ConversationState` e disparadas na elipse de `"por que"`.
- **Regra Criada**: Perguntas de "Por quê?" devem explicar os fundamentos técnicos da recomendação anterior.
- **Teste de Regressão**: `ATH-CONV-005` (Golden Case)

---

### 📌 [ATH-CONV-006] Distinção entre Saúde da Athena e Estado do Ecossistema
- **ID de Falha**: `ATH-FAIL-006`
- **Categoria**: `INTENT_MISCLASSIFICATION`
- **Sintoma**: *"Como está seu sistema?"* gerava confusão com *"Como está meu sistema?"*.
- **Causa-Raiz**: Falta de resolução de alvo pronominal (*"seu"* = Athena; *"meu"* = Usuário/VARYNTH).
- **Correção**: Roteamento de `ATHENA_SELF_STATUS` (Kernel, Conselho, Memória) vs `ECOSYSTEM_STATUS` (Tarefas, Projetos, Prazos).
- **Regra Criada**: Distinção clara entre diagnóstico do copilot e recursos do usuário.
- **Teste de Regressão**: `ATH-CONV-006` (Golden Case)

---

### 📌 [ATH-CONV-007] Tratamento de Humor Casual e Desabafo
- **ID de Falha**: `ATH-FAIL-007`
- **Categoria**: `OVER_TOOL_USAGE`
- **Sintoma**: Mensagens como *"kkkkk você está ficando complicada"* ou *"tá foda em"* acionavam parsers pesados.
- **Causa-Raiz**: Ausência de filtro no Fast Path para empatia e humor.
- **Correção**: Roteamento direto no Fast Path sem chamadas ao banco ou Action Layer.
- **Regra Criada**: Risadas e desabafos recebem respostas leves e ofertas de foco imediato.
- **Teste de Regressão**: `ATH-CONV-007` (Golden Case)

---

### 📌 [ATH-CONV-008] Comando Operacional Determinístico
- **ID de Falha**: `ATH-FAIL-008`
- **Categoria**: `OPERATIONAL_MISREAD`
- **Sintoma**: Comandos como *"Crie uma tarefa..."* corriam risco de ser tratados como conversa reflexiva.
- **Causa-Raiz**: Falta de separação prévia da via de mutação de estado.
- **Correção**: Direcionamento obrigatório para `OPERATIONAL_REQUEST` ➔ Action Layer ➔ `ToolManager` ➔ Audit Trail.
- **Regra Criada**: Comandos imperativos de mutação sempre executam via Action Layer determinístico.
- **Teste de Regressão**: `ATH-CONV-008` (Golden Case)

---

### 📌 [ATH-CONV-009] Crítica Rigorosa via Critias (Precedência sobre Ideação)
- **ID de Falha**: `ATH-FAIL-009`
- **Categoria**: `INTENT_MISCLASSIFICATION`
- **Sintoma**: *"Critique essa ideia"* era capturado pela palavra *"ideia"*, gerando novo brainstorm em vez de análise crítica.
- **Causa-Raiz**: Precedência incorreta de regras na composição de intenções.
- **Correção**: Precedência estrita de `CRITIQUE` sobre `BRAINSTORM`, ativando o especialista **Critias**.
- **Regra Criada**: Pedidos de crítica apontam riscos, pontos cegos e medidas mitigadoras.
- **Teste de Regressão**: `ATH-CONV-009` (Golden Case)

---

### 📌 [ATH-CONV-010] Comparação Estruturada entre Duas Iniciativas
- **ID de Falha**: `ATH-FAIL-010`
- **Categoria**: `INCOMPLETE_RESPONSE`
- **Sintoma**: *"Compare os dois"* não gerava análise comparativa bilateral quando havia duas iniciativas no contexto.
- **Causa-Raiz**: Falta de gerador dedicado de matriz comparativa.
- **Correção**: Matriz comparativa bilateral com pontos fortes, desafios e veredito estratégico.
- **Regra Criada**: Comparações avaliam ambas as entidades de forma equilibrada com recomendação de direcionamento.
- **Teste de Regressão**: `ATH-CONV-010`

---

### 📌 [ATH-CONV-011] Política de Honestidade em Baixa Confiança
- **ID de Falha**: `ATH-FAIL-011`
- **Categoria**: `FALSE_UNDERSTANDING`
- **Sintoma**: Mensagens ininteligíveis recebiam respostas fingindo compreensão.
- **Causa-Raiz**: Falta de política honesta para entradas de baixa confiança.
- **Correção**: Admissão honesta de incerteza e solicitação de esclarecimento direcionado.
- **Regra Criada**: Nunca afirmar *"Entendi perfeitamente"* em confiança baixa.
- **Teste de Regressão**: `ATH-CONV-011`

---

## 🚀 Como Executar a Suíte de Regressão

```bash
# Executar a Suíte Histórica Completa com Quality Gates
npm run test:athena:regression

# Executar a Suíte de Testes Conversacionais Gerais
npm run test:athena:conversation

# Executar todos os testes
npm run test:athena
```

---

## 🔒 Regra de Bloqueio de Regressão

Nenhuma refatoração ou nova funcionalidade na Athena pode ser enviada para produção se quebrar qualquer um dos casos históricos acima. A qualidade conversacional da Athena acumula robustez a cada versão.
