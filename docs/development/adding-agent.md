# Como Adicionar um Novo Agente ao Conselho Cognitivo

## 1. Passo a Passo

Para adicionar um novo especialista ao Conselho da Athena:

### Passo 1: Implementar a Interface `AthenaAgent`
Crie o arquivo em `src/lib/athena/agents/council/[nome-agente].ts`:

```ts
import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";

export class MeuNovoAgente implements AthenaAgent {
  manifest: AgentManifest = {
    id: "meu_agente",
    name: "Nome do Agente",
    role: "Especialista em X",
    version: "1.0.0",
    description: "Competências formais do agente",
    skills: ["habilidade_1", "habilidade_2"],
    priority: 80,
    enabled: true,
  };

  canHandle(task: AthenaTask): boolean {
    return task.type === "MINHA_TASK_TYPE";
  }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    // Raciocínio especializado do domínio
    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content: "Análise especializada...",
      confidence: 0.9,
    };
  }
}
```

### Passo 2: Registrar no `AgentRegistry`
Em `src/lib/athena/agents/registry.ts`, instancie e registre o agente na lista oficial.
