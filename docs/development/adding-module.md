# Como Adicionar um Novo Módulo ao VARYNTH OS

## 1. Passo a Passo de Engenharia

Para integrar um novo módulo especializado ao VARYNTH OS (ex: `Studio`, `Graph`, etc.), siga as etapas abaixo:

### Passo 1: Definir os Tipos do Domínio
Crie o arquivo de tipos em `src/lib/types/[modulo].ts` e re-exporte em `src/lib/types/index.ts`:

```ts
export interface MeuModuloItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
```

### Passo 2: Criar a Rota no App Router
Crie a página principal em `src/app/modules/[modulo]/page.tsx` utilizando os componentes de navegação (`Header`, `Sidebar`, `AthenaSidecar`).

### Passo 3: Registrar no Hub de Módulos
Adicione o módulo na lista oficial em `src/app/modules/page.tsx` para disponibilizá-lo no catálogo central.

### Passo 4: Expor Ferramentas para a Athena
Cadastre as operações de leitura e escrita no `ToolManager` (`src/lib/athena/tools/tool-manager.ts`) e inclua no `ContextBuilder` (`src/lib/athena/memory/context-builder.ts`).

### Passo 5: Suportar o Protocolo da Lixeira
Assegure que as operações de exclusão utilizem o `TrashManager` com prazo de 10 dias e suporte a *Undo*.

