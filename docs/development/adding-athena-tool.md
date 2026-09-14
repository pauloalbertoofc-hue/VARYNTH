# Como Adicionar uma Nova Ferramenta à Action Layer da Athena

## 1. Passo a Passo

Para disponibilizar uma nova ferramenta determinística para a Athena:

### Passo 1: Definir o Esquema da Ferramenta
Em `src/lib/athena/domain/action.ts`, adicione o identificador da ferramenta na tipagem:

```ts
export type AthenaToolName =
  | "tasks.create"
  | "meuModulo.minhaAcao"
  // ...
```

### Passo 2: Registrar o contrato e implementar no `ToolManager`
O catálogo canônico é `src/lib/athena/tools/registry.ts`. Defina entradas, saída, domínio alvo e se a operação é leitura ou mutação; então conecte a execução em `src/lib/athena/tools/tool-manager.ts`, garantindo carimbo no `AuditTrail`:

```ts
this.registerTool({
  name: "meuModulo.minhaAcao",
  description: "Executa ação segura no módulo",
  requiresConfirmation: false,
  execute: async (params, ctx) => {
    // 1. Executar mutação ou leitura
    // 2. Registrar no AuditTrail se for mutação
    // 3. Retornar resultado tipado
  }
});
```

### Passo 3: Adicionar Caso na Suíte de Regressão
Adicione um teste em `src/lib/athena/regression/cases.ts` para garantir que comandos correspondentes acionem a nova ferramenta sem regressões.

### Passo 4: Documentar e governar

Atualize `docs/athena/tools.md`, incluindo propósito, dados recebidos/produzidos, dependências, riscos, diagnóstico e teste. A ferramenta não pode conceder a si mesma autoridade: `UNDERSTAND != EXECUTE != PUBLISH != DESTROY`; ações sensíveis devem usar `PermissionPolicyEngine`, token de confirmação vinculado ao contexto e, para código não confiável, `SANDBOX != CORE`.
