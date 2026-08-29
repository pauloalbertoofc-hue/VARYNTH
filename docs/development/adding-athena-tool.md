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

### Passo 2: Implementar a Lógica no `ToolManager`
Em `src/lib/athena/tools/tool-manager.ts`, implemente o método correspondente garantindo carimbo no `AuditTrail`:

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

