# Athena Local-First Architecture & Technological Sovereignty

> **"Athena is a local-first cognitive system. External AI providers are optional extensions, never foundational dependencies."**

---

## 1. Princípio Fundamental

O projeto **Athena** no **VARYNTH OS** é regido pelo princípio permanente da **Soberania Tecnológica**:

**Local-first · Offline-capable · Provider-agnostic · Self-contained**

A Athena **NÃO** é arquiteturalmente dependente de:
* OpenAI;
* Google Gemini;
* Anthropic Claude;
* APIs comerciais de IA;
* Serviços SaaS de inferência;
* Serviços externos pagos;
* Conexão permanente com a internet.

O sistema continua **100% operacional e útil** mesmo se nenhuma API externa estiver configurada ou se a internet for desconectada. Esta é uma **decisão arquitetural permanente**, e não uma restrição transitória.

---

## 2. Regra de Soberania (Componentes 100% Locais)

Todos os subsistemas nucleares da Athena pertencem ao próprio ecossistema VARYNTH e rodam localmente:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VARYNTH TRUST ZONE (LOCAL)                      │
├────────────────────────────────────────────────────────────────────────┤
│ • Cognitive Kernel & Executive Controller                              │
│ • Perception Engine, Router & Scheduler                                │
│ • Workflow Engine & State Machine                                      │
│ • Agent Registry & Conselho de 7 Especialistas                         │
│ • Tool Manager & Action Layer                                          │
│ • Memory Manager & Context Builder                                     │
│ • Deliberation Engine & Reflection Engine (Critias)                    │
│ • Capability Discovery & Graceful Degradation                          │
│ • Audit Trail & Event Bus                                              │
│ • Busca Local no Vault, Codex, Research, Chronos e Workspaces          │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                       (Explicit Permission Only)
                                    ▼
                      External Optional Extensions
```

---

## 3. Inteligência ≠ Chamada para LLM

A inteligência da Athena é composta de forma multifacetada:
1. **Regras e Heurísticas**: Lógica dedutiva e dialética estruturada.
2. **Workflows & State Machines**: Planejamento sequencial e estados finitos previsíveis.
3. **Memória Multi-tier**: Sessão, memória de trabalho, episódica e semântica.
4. **Action Layer**: Operações executáveis sobre tarefas, notas, editais e projetos.
5. **Conselho de Agentes**: Especialistas com contratos e critérios formais.
6. **Reflexão e Blindagem Crítica**: Análise de coerência e mitigação de riscos lógicos.
7. **Modelos Locais Opcionais**: Inferência aberta sem custos de nuvem.

> **LLMs são apenas uma possível ferramenta cognitiva complementar, não o núcleo arquitetural da Athena.**

---

## 4. Agentes Não São Apenas Prompts

Os membros do Conselho (**Justitia, Logos, Sophia, Musa, Strategos, Mnemosyne e Critias**) possuem:
- Identidade e domínio de conhecimento;
- Manifestos formais de competência (`AgentManifest`);
- Ferramentas autorizadas no VARYNTH;
- Critérios de confiança e revisão;
- Contratos estritos de entrada e saída (`AthenaAgent`).

Eles funcionam nativamente por mecanismos determinísticos e podem, futuramente, receber suporte de modelos locais abertos sem que sua existência dependa do modelo.

---

## 5. Runtimes de Modelos Locais & `LocalModelManager`

A arquitetura prevê interfaces abertas para runtimes locais (ex: Ollama, Llama.cpp):

```ts
interface CognitiveModel {
  id: string;
  name: string;
  providerType: "local" | "external";
  available(): Promise<boolean>;
  generate(request: ModelRequest): Promise<ModelResponse>;
}
```

### Regra do Zero Modelos:
Quando `availableModels = []`, **Athena continua 100% OPERACIONAL**.

---

## 6. Hierarquia Soberana do `ModelRouter`

O `CognitiveModelRouter` (`src/lib/athena/models/model-router.ts`) aplica estritamente a seguinte ordem:

```
1. Execução Determinística / Regras Locais (Core)
       ↓
2. Modelo Aberto Local (Ollama / Llama.cpp no hardware do usuário)
       ↓
3. Provider Externo Opcional (apenas se autorizado explicitamente)
```

**Essa prioridade nunca é invertida.**

---

## 7. Proibição de Exigência de API Keys

- A Athena **nunca** solicita chaves de API por padrão.
- Não existem telas de bloqueio solicitando chaves da OpenAI, Gemini ou Anthropic.
- Se o usuário nunca configurar nenhuma chave externa, o VARYNTH OS funciona indefinidamente.

---

## 8. Capability Discovery & Graceful Degradation

O sistema de capacidades (`src/lib/athena/kernel/capabilities.ts`) inspeciona o ambiente em tempo real:

| Capacidade | Status no Baseline | Fonte | Requer Internet? |
| :--- | :--- | :--- | :--- |
| **`TASK_CREATION`** | ✅ DISPONÍVEL | Core | ❌ Não |
| **`NOTE_CAPTURE`** | ✅ DISPONÍVEL | Core | ❌ Não |
| **`CHRONOS_DEADLINE_SYNC`** | ✅ DISPONÍVEL | Core | ❌ Não |
| **`VAULT_LOCAL_SEARCH`** | ✅ DISPONÍVEL | Tool | ❌ Não |
| **`CODEX_ARGUMENT_ANALYSIS`**| ✅ DISPONÍVEL | Agent (Justitia) | ❌ Não |
| **`RESEARCH_EVIDENCE_BOARD`**| ✅ DISPONÍVEL | Agent (Logos) | ❌ Não |
| **`SAFE_TRASH_PROTOCOL`** | ✅ DISPONÍVEL | Core | ❌ Não |
| **`GLOBAL_UNDO_MANAGEMENT`** | ✅ DISPONÍVEL | Core | ❌ Não |
| **`AUDIT_TRAIL_OBSERVABILITY`**| ✅ DISPONÍVEL | Core | ❌ Não |
| **`COUNCIL_DELIBERATION`** | ✅ DISPONÍVEL | Council | ❌ Não |
| **`REFLECTION_VALIDATION`** | ✅ DISPONÍVEL | Agent (Critias) | ❌ Não |
| **`LOCAL_MODEL_INFERENCE`** | ⏸️ Desabilitado | Local Model | ❌ Não |
| **`EXTERNAL_MODEL_INFERENCE`**| ⏸️ Desabilitado | External Plugin | 🌐 Sim |
| **`WEB_LIVE_SEARCH`** | ⏸️ Desabilitado | External Plugin | 🌐 Sim |

---

## 9. Testes de Sobrevivência Arquitetural

### 🧪 Teste 1: Provider Failure Test
> *"Se amanhã a OpenAI, Google, Anthropic e qualquer outro provedor deixarem de existir, a Athena continua funcionando?"*
> 
> **RESPOSTA: SIM.** O Kernel, Workspaces, Conselho, Lixeira, Audit Trail e Ferramentas continuam intactos.

### 🧪 Teste 2: Internet Failure Test
> *"Se o computador perder a conexão com a internet, a Athena continua útil?"*
> 
> **RESPOSTA: SIM.** Toda a gestão local, notas, tarefas, acervos, deliberações e histórico operam normalmente sem rede.

---

## 10. Baseline de Custo Zero

```
CUSTO OBRIGATÓRIO DO NÚCLEO DA ATHENA = R$ 0,00
```

Nenhuma funcionalidade central da Athena acarreta custos variáveis obrigatórios de inferência em nuvem.

---

## 11. Checklist para Futuras Features

Toda nova funcionalidade adicionada à Athena deve responder afirmativamente:
- [x] **Pode funcionar localmente?**
- [x] **Se precisar de modelo, pode usar modelo local?**
- [x] **Se usar serviço externo, existe fallback determinístico gracioso?**
- [x] **Se o serviço externo cair, o VARYNTH continua operacional?**
- [x] **Os dados permanecem sob a Trust Zone do VARYNTH?**
