# Matriz de rastreabilidade: código, testes e documentação

Esta matriz é um mapa de manutenção, não uma lista aspiracional. O arquivo ou registro indicado é a fonte operacional; a documentação explica a intenção, as fronteiras e a forma de mudança segura.

| Capacidade | Fonte operacional | Testes principais | Documento canônico |
|---|---|---|---|
| Registro de módulos e navegação | `src/lib/modules.ts`, `src/app/` | `platform-integrity`, `studio-discoverability` | `docs/varynth/modules.md` |
| Contratos e execução Athena | `src/lib/athena/engine.ts`, `domain/`, `tools/` | `athena-system`, contratos, capabilities | `docs/athena/architecture.md`, `tools.md` |
| Agentes | `athena/agents/registry.ts`, `council/` | `capability-selection`, `athena-system` | `docs/athena/agents.md`, `development/adding-agent.md` |
| Autoridade e confirmação | `PermissionPolicyEngine` em `permissions/permission-policy.ts` | `test:permissions`, `test:hardening` | `architecture/permission-policy.md`, `ADR-008` |
| MemoryGate e contexto | `athena/memory/` | `test:athena-system`, `test:athena-memory` | `docs/athena/memory.md` |
| Eventos e auditoria | `athena/events/`, `observability/`, stores | `athena-observability`, `hardening` | `architecture/data-flow.md`, `security-model.md` |
| Persistência e migração | `persistence/`, `store/` | `test:persistence` | `architecture/persistence-matrix.md` |
| Backup e recuperação | `backup/` | `test:backup`, `test:hardening` | `architecture/backup-and-recovery.md` |
| Jobs e sandbox | `runtime/` | `test:jobs`, `test:sandbox`, `test:sandbox:web` | `architecture/job-runtime-and-sandbox-architecture.md` |
| Studios e artefatos | `studio/`, `artifacts/`, `orchestration/` | suites de studio, `test:cross-studio`, `test:orchestration` | `architecture/*-studio-architecture.md`, `universal-artifact-system.md` |
| Notificações | `notifications/` | `test:notifications`, `test:hardening` | `architecture/job-runtime.md` e este mapa |
| Integrações externas opt-in | `athena/integrations/`, `external/`, `src/app/api/integrations/` | `test:athena-integrations`, OAuth e Calendar sync | `docs/athena/local-first.md` e `docs/athena/tools.md` |
| Regressão documental | `docs/documentation-regression.test.ts`, `athena/guardian/` | `test:docs:regression`, `test:review` | `ADR-043`, `development/testing.md` |

## Uso na manutenção

Ao mudar uma linha de uma fonte operacional, localize a linha correspondente, execute os testes associados e atualize o documento canônico. Se a mudança alterar autoridade, persistência, contrato público, segurança, integração, modelo de dados ou arquitetura, avalie ADR. Se não houver linha correspondente, crie-a antes de concluir.
