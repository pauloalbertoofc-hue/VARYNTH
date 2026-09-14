# Auditoria documental do VARYNTH — 2026-09-06

## Escopo e método

Auditoria baseada no estado real do checkout em 2026-09-06, incluindo alterações locais não commitadas. Foram confrontados `src/`, `src/app/`, `package.json`, `docs/`, testes e ADRs. O código é a fonte de verdade; textos históricos, planos e contagens declaradas não foram tratados como prova de implementação.

## Inventário verificado

| Área | Evidência no código | Documentação encontrada | Situação |
|---|---|---|---|
| Interface, módulos e rotas | `src/app/`, `src/lib/modules.ts` | `docs/varynth/`, `docs/modules/` | Parcial: o registro atual tem módulos adicionais e a documentação usa contagens antigas |
| Athena | `src/lib/athena/` | `docs/athena/`, `docs/architecture/athena-*` | Ampla, mas com números e nomes desatualizados |
| Ferramentas | `src/lib/athena/tools/registry.ts` e `tool-manager.ts` | `docs/athena/tools.md` | Desatualizada: o catálogo não tem 14 itens; há ferramentas criativas e de planos |
| Agentes | `src/lib/athena/agents/registry.ts` | `docs/athena/agents.md` | Desatualizada: o registro atual inclui 11 agentes, não apenas 7 |
| Soberania e permissões | `permissions/`, `hardening/`, `athena/guardian/` | `security-model.md`, `permission-policy.md`, ADRs | Parcial: princípios estão descritos, mas faltava distinguir capacidade, autoridade e sandbox em todos os fluxos |
| MemoryGate | `athena/memory/memory-gate.ts` | `docs/athena/memory.md` | Conceito documentado; contrato operacional e limites agora ficam explicitados neste relatório |
| Persistência e backup | `persistence/`, `backup/` | `persistence-matrix.md`, `backup-and-recovery.md` | Implementados e documentados, mas não estavam no caminho principal de onboarding |
| Jobs, sandbox e orchestration | `runtime/`, `orchestration/`, `studio/` | documentos de arquitetura e ADRs | Cobertura fragmentada; faltava mapa de integração e diagnóstico |
| Notificações e integrações | `notifications/`, `external/`, `athena/integrations/`, API routes | sem seção equivalente no índice principal | Lacuna de descoberta e manutenção |
| Testes | `src/**/*.test.ts` e scripts em `package.json` | `docs/development/testing.md` | Cobertura descrita com números históricos incorretos e sem matriz código→teste |
| Guard documental | `athena/guardian/` | índice e tela Technical Archive | Implementação existente, mas contagens/status eram hard-coded e podiam declarar 100% com drift |

## Divergências código × documentação

1. `README.md` declarava Next.js 15 e FastAPI; o package atual usa Next.js 16 e não contém backend FastAPI.
2. A documentação declarava 14 ferramentas e 7 agentes. O registro atual contém 35 ferramentas nomeadas e 11 agentes registrados.
3. O manual declarava 20/20 rotas e a arquitetura dizia 20; o inventário atual possui 17 route handlers.
4. O manual dizia “100% dos testes e rotas aprovados” sem um comando único que execute todos os testes declarados.
5. A lista textual de módulos e o registro em `src/lib/modules.ts` não eram a mesma coisa; módulos de sistema, Studio Hub e Technical Archive ficavam fora de alguns documentos.
6. A documentação de segurança descrevia `AuditTrail` e caminhos que não podem ser assumidos sem verificar o código atual; os contratos reais estão distribuídos entre event bus, stores, journal, permission engine e transaction journal.
7. A afirmação “100% offline” é forte demais para o estado atual: existem OAuth/Google, APIs de integração, Blob e inferência Ollama opcional. A propriedade correta é Local-First com integrações opt-in e fronteiras de autoridade.

## Lacunas e riscos de conhecimento implícito

- Não havia um inventário derivado do código para impedir que novas rotas, ferramentas, agentes e módulos fossem adicionados sem documentação.
- O guard calculava saúde a partir de números fixos e marcava subsistemas como `SYNCED` sem comparar arquivos reais.
- A documentação de adição de ferramentas/agentes não explicava suficientemente o caminho de seleção, contrato, autorização, execução, auditoria e testes.
- Integrações Google, notificações, backup, migrações, fallback de persistência e falhas transacionais precisavam de uma visão de ciclo de vida comum.
- O papel de Athena como orquestradora não deve ser confundido com autoridade: seleção/plano pode propor; `PermissionPolicyEngine` decide; confirmação humana continua obrigatória onde o código exige.

## Limites soberanos que devem ser preservados

- `UNDERSTAND != EXECUTE != PUBLISH != DESTROY`: cada fronteira deve continuar sendo uma etapa e uma decisão distinta.
- `SANDBOX != CORE`: jobs, Forge, Labs e previews não ganham acesso implícito ao Core, ao host ou à rede.
- Nenhum agente ou modelo neural pode ampliar o próprio perfil, emitir autorização ou contornar o `PermissionPolicyEngine`.
- `MemoryGate` decide o que pode virar memória persistente; contexto recuperado não é autorização para mutação.
- Tokens de confirmação são vinculados ao contexto e não podem ser reutilizados; exclusão permanente continua proibida para Athena.
- Auditoria e notificações não podem transformar falha de notificação em falso commit nem ocultar falha de execução.

## Estado após esta auditoria

Foram corrigidas as afirmações públicas comprovadamente erradas, adicionada esta auditoria, formalizada a Definition of Done, criada uma decisão arquitetural para o contrato documental e adicionado um teste de regressão que calcula o inventário a partir do checkout.

## Itens que exigem decisão humana

- Se “Local-First” deve permitir integrações Google/Blob no produto publicado ou se elas devem ser removidas/restritas por política de implantação.
- Quais dos 11 agentes são produto suportado versus compatibilidade/legado, pois o código os registra, mas a documentação anterior só apresentava o conselho clássico de 7.
- Se os módulos históricos Codex, Research, Opportunities, Forge e LigaHub têm telas completas ou contratos de produto ainda experimentais.
- Qual changelog público deve receber este ciclo, já que não havia arquivo CHANGELOG no checkout.
