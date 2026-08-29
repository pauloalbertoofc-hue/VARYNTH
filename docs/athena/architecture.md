# Athena Cognitive Kernel — Diretrizes Arquiteturais

## 🛡️ Política de Independência: Zero APIs Externas

Nesta fase do **VARYNTH OS**, a Athena foi construída com foco exclusivo em:
- **Arquitetura Cognitiva Estruturada**: Kernel, Perception, Router, Scheduler, Reflection e Response Builder.
- **Integração Profunda com o VARYNTH**: Conexão com Workspaces, Vault, Codex, Research, Chronos, Opportunities, Forge e Lixeira.
- **Workflows & Action Layer**: Ferramentas determinísticas com carimbo formal no Audit Trail.
- **Conselho de Especialistas**: Justitia, Logos, Sophia, Musa, Strategos, Mnemosyne e Critias.
- **Soberania e Privacidade de Dados**: 100% offline, local e determinístico, sem envio de dados para servidores de terceiros.

---

## 🚫 Proibições Rígidas Desta Fase

1. **Sem Chamadas HTTP para LLMs Comerciais**: Não há integração com OpenAI, Google Gemini, Anthropic Claude, Ollama ou equivalentes.
2. **Sem Chaves de API**: Nenhuma `API_KEY` ou credencial de terceiros é necessária ou solicitada.
3. **Sem Pacotes Externos de IA**: Nenhuma dependência comercial de SDK de inferência está instalada no `package.json`.

---

## 🔌 `LLMAdapter` como Abstração para o Futuro

A interface `LLMAdapter` (`src/lib/athena/models/adapter.ts`) foi definida como um **contrato abstrato para o futuro**:

```ts
export interface LLMAdapter {
  id: string;
  name: string;
  generate(request: ModelRequest): Promise<ModelResponse>;
}
```

Quando for decidido integrar modelos (sejam locais ou em nuvem), providers poderão ser adicionados como plugins/adapters sem reconstruir o Kernel, respeitando o princípio:
> **O Kernel conhece contratos, não implementações específicas.**

---

## 👥 Conselho de Agentes Determinístico

Os 7 agentes do Conselho (`Council of Agents`) operam com base em:
- **Manifestos e Habilidades**: Declaração formal de competências.
- **Regras Hermenêuticas e Metodológicas**: Análise de teses, precedentes, evidências e cronogramas.
- **Extração Cirúrgica de Contexto**: Uso do `ContextBuilder` para inspecionar os módulos relevantes do VARYNTH.
- **Revisão Crítica com Critias**: Validação de consistência e identificação de riscos antes da entrega final.

