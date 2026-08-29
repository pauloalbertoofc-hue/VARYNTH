# 🏛️ VARYNTH OS — Documentação Técnica Oficial & Manual Arquitetural

Bem-vindo à documentação técnica oficial e definitiva do **VARYNTH OS** e do seu copilot cognitivo soberano, **Athena**.

Este repositório documental foi concebido para atender a quatro finalidades estratégicas de engenharia:
1. **Preservação de Conhecimento**: Permitir a compreensão profunda e manutenção do sistema a qualquer momento no futuro.
2. **Engenharia de Sustentação**: Viabilizar a reconstrução, expansão e evolução de componentes sem quebras ou regressões.
3. **Registro do "Porquê" (Rationale)**: Documentar não apenas o código existente, mas as causas-raiz, erros reais e decisões de arquitetura (ADRs) que moldaram o sistema.
4. **Referência Técnica Autônoma**: Servir como base técnica rigorosa para apresentações, artigos acadêmicos, publicações de engenharia e portfólio, sem expor dados privados ou milhares de páginas de conversas.

---

## 🧭 Como Navegar nesta Documentação (3 Níveis de Leitura)

Para acomodar diferentes necessidades de profundidade técnica sem exigir a leitura linear de milhares de páginas, a documentação está organizada em **3 Níveis de Acesso**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ NÍVEL 1: VISÃO EXECUTIVA (10 Minutos)                                   │
│ ├─ docs/README.md (Este índice)                                         │
│ ├─ docs/architecture/overview.md (Filosofia e pilares do sistema)       │
│ └─ docs/architecture/system-map.md (Mapa de subsistemas e topologia)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ NÍVEL 2: MANUAL ARQUITETURAL COMPACTO (1 Hora)                          │
│ └─ docs/handbook/VARYNTH-TECHNICAL-HANDBOOK.md                          │
│    (Manual de 20 capítulos condensando toda a engenharia essencial)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ NÍVEL 3: REFERÊNCIA TÉCNICA PROFUNDA (Por Componente)                   │
│ ├─ docs/architecture/ (Data Flow, Segurança, Local-First)               │
│ ├─ docs/varynth/ (Workspaces, Projetos, Lixeira, Atividades)            │
│ ├─ docs/athena/ (Kernel Cognitivo, Conversation, Memória, Agentes)      │
│ ├─ docs/modules/ (Vault, Codex, Research, Chronos, Labs, Forge, etc.)   │
│ ├─ docs/adr/ (Architecture Decision Records)                            │
│ ├─ docs/development/ (Guias de Setup, Testes, Extensões e Padrões)      │
│ └─ docs/history/ (Linha do Tempo, Marcos e Lições Aprendidas)           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Mapa de Diretórios e Documentos

### 1. 🏗️ Arquitetura Global (`/docs/architecture`)
- [`overview.md`](./architecture/overview.md): Filosofia central, princípios de soberania e macro-arquitetura.
- [`system-map.md`](./architecture/system-map.md): Mapa topológico e matriz de subsistemas implementados vs planejados.
- [`data-flow.md`](./architecture/data-flow.md): Fluxo reativo de dados, mutações e barramento de eventos.
- [`security-model.md`](./architecture/security-model.md): Modelo de segurança local, auditoria e princípio *Fail-Closed* (Alex Principle).
- [`local-first.md`](./architecture/local-first.md): Arquitetura Local-First, soberania de dados e inferência local adaptativa.

### 2. 🌌 VARYNTH OS Core (`/docs/varynth`)
- [`overview.md`](./varynth/overview.md): Núcleo do sistema operacional, cockpit unificado e ciclo de vida.
- [`projects.md`](./varynth/projects.md): Gestão de Workspaces, Projetos, Tarefas e Matriz de Priorização.
- [`dashboard.md`](./varynth/dashboard.md): Painel central de controle, telemetria operacional e widgets dinâmicos.
- [`trash.md`](./varynth/trash.md): Protocolo de retenção de 10 dias, suporte a Desfazer (*Undo*) e exclusão segura.
- [`activity.md`](./varynth/activity.md): Trilha de auditoria cronológica e registro de atores (*User, Athena, System*).
- [`modules.md`](./varynth/modules.md): Registro dinâmico de módulos, status de prontidão e contratos de navegação.

### 3. 🦉 Athena Cognitive System (`/docs/athena`)
- [`overview.md`](./athena/overview.md): Visão geral do copilot cognitivo e princípios conversacionais.
- [`architecture.md`](./athena/architecture.md): Arquitetura de 3 vias (Fast, Cognitive, Operational) e pipeline interno.
- [`cognitive-kernel.md`](./athena/cognitive-kernel.md): Kernel Cognitivo V4, Percepção Híbrida e Roteador de Tarefas.
- [`conversation-manager.md`](./athena/conversation-manager.md): Gestão de sessões, composição de intenções e resolução de anáforas/elipses.
- [`memory.md`](./athena/memory.md): Memory Gate, Context Builder, Base Epistêmica Offline e Local RAG.
- [`agents.md`](./athena/agents.md): Conselho de Especialistas (Justitia, Logos, Sophia, Musa, Strategos, Mnemosyne, Critias).
- [`deliberation.md`](./athena/deliberation.md): Deliberação dialética multiagente e síntese consensual.
- [`tools.md`](./athena/tools.md): Action Layer, catálogo de 14 ferramentas determinísticas e trilha de auditoria.
- [`workflows.md`](./athena/workflows.md): Orquestração de workflows determinísticos em DAG e agendamento.
- [`local-models.md`](./athena/local-models.md): Detecção automática de hardware, Ollama local e independência de modelo.
- [`safety.md`](./athena/safety.md): Política anti-evasão, honestidade de compreensão e barreiras *Fail-Closed*.
- [`conversational-regressions.md`](./athena/conversational-regressions.md): Catálogo de falhas históricas, suíte de 73 testes e quality gates.

### 4. 🧩 Módulos Especializados (`/docs/modules`)
- [`vault.md`](./modules/vault.md): Acervo universal de conhecimento, fichamento e taxonomias.
- [`codex.md`](./modules/codex.md): Matriz dialética de teses jurídicas, Argument Arena e precedentes.
- [`research.md`](./modules/research.md): Evidence Board, fontes primárias e síntese bibliográfica com rigor probatório.
- [`opportunities.md`](./modules/opportunities.md): Radar de oportunidades, editais, bolsas e cálculo de aderência.
- [`forge.md`](./modules/forge.md): Oficina de prototipagem, templates e criação de produtos intelectuais.
- [`people.md`](./modules/people.md): Rede de contatos, pesquisadores e grafo relacional de colaboradores.
- [`labs.md`](./modules/labs.md): Incubadora de experimentos de alto impacto, hipóteses e testes rápidos.
- [`chronos.md`](./modules/chronos.md): Motor temporal de marcos, prazos processuais e linha do tempo.

### 5. 📜 Architecture Decision Records (`/docs/adr`)
- [`ADR-001`](./adr/ADR-001-local-first-sovereignty.md): Soberania Local-First e Independência de APIs Comerciais.
- [`ADR-002`](./adr/ADR-002-ten-day-trash-retention.md): Retenção de 10 Dias na Lixeira, Desfazer e Alex Principle.
- [`ADR-003`](./adr/ADR-003-three-path-interaction-routing.md): Roteamento em 3 Vias de Interação (Fast, Cognitive, Operational).
- [`ADR-004`](./adr/ADR-004-anti-generic-fallback-policy.md): Política Anti-Fallback Genérico e Validação de Completude.
- [`ADR-005`](./adr/ADR-005-council-multi-agent-deliberation.md): Conselho Determinístico de 7 Especialistas Cognitivos.
- [`ADR-006`](./adr/ADR-006-embedded-epistemic-knowledge-base.md): Base Epistêmica Embutida Offline para Filosofia, Direito e Ciência.

### 6. 🛠️ Desenvolvimento & Engenharia (`/docs/development`)
- [`setup.md`](./development/setup.md): Configuração de ambiente, ferramentas e comandos essenciais.
- [`testing.md`](./development/testing.md): Execução de testes de regressão, build e validação de qualidade.
- [`adding-module.md`](./development/adding-module.md): Guia passo a passo para criar novos módulos no VARYNTH.
- [`adding-athena-tool.md`](./development/adding-athena-tool.md): Como cadastrar novas ferramentas determinísticas na Action Layer.
- [`adding-agent.md`](./development/adding-agent.md): Como criar e registrar novos agentes no Conselho Cognitivo.
- [`conventions.md`](./development/conventions.md): Convenções de código, tipagem estrita e padrões arquiteturais.

### 7. ⏳ Histórico & Evolução (`/docs/history`)
- [`timeline.md`](./history/timeline.md): Linha do tempo da engenharia do VARYNTH (da V1 modular à V4 cognitiva).
- [`milestones.md`](./history/milestones.md): Principais marcos técnicos e transformações arquiteturais.
- [`lessons-learned.md`](./history/lessons-learned.md): Lições aprendidas com falhas reais e princípios derivados.

### 8. 📘 Manual Arquitetural Oficial (`/docs/handbook`)
- [`VARYNTH-TECHNICAL-HANDBOOK.md`](./handbook/VARYNTH-TECHNICAL-HANDBOOK.md): O livro completo de engenharia do VARYNTH OS em 20 capítulos estruturados.

---

## 🔒 Princípio de Integridade Documental

> **Regra de Engenharia**: Toda modificação relevante de contratos, arquitetura, segurança ou comportamento deve ser refletida na documentação técnica correspondente antes da conclusão da tarefa. A documentação é tratada como um cidadão de primeira classe do produto.

