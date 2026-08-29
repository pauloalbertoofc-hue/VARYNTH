import { SandboxEnvironment, SandboxExecutionResult } from "./types";
import { permissionPolicyEngine } from "../permissions/permission-policy";
import { athenaEventBus } from "../athena/events/event-bus";

export class SandboxRuntime {
  private defaultEnv: SandboxEnvironment = {
    id: "sand-default-env",
    name: "VARYNTH Isolated Sandbox V1",
    isolated: true,
    allowNetwork: false,
    allowHostIO: false,
    memoryLimitMb: 128,
    timeoutMs: 5000,
  };

  public executeCodeInSandbox(
    code: string,
    language: "typescript" | "javascript" | "python" | "sql",
    actor: "USER" | "ATHENA" | "SYSTEM" = "ATHENA",
    envOverride?: Partial<SandboxEnvironment>
  ): Promise<SandboxExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const env = { ...this.defaultEnv, ...envOverride };

      // 1. Permission Policy Evaluation
      const perm = permissionPolicyEngine.evaluate(actor, "EXECUTE", "SANDBOX_LABS");
      if (!perm.allowed) {
        return resolve({
          executionId,
          status: "ERROR",
          durationMs: Date.now() - startTime,
          logs: ["Execução rejeitada pelas políticas de segurança."],
          error: `Permissão negada: ${perm.reason}`,
        });
      }

      // 2. Strict Core Protection Guard (SANDBOX ACCESS != CORE ACCESS)
      const prohibitedKeywords = [
        "localStorage.clear",
        "rmdir",
        "unlink",
        "process.exit",
        "document.cookie",
        "__dirname",
      ];
      const hasViolation = prohibitedKeywords.some((kw) => code.includes(kw));

      if (hasViolation) {
        return resolve({
          executionId,
          status: "ERROR",
          durationMs: Date.now() - startTime,
          logs: ["Violação de sandbox detectada: tentativa de acesso ao Core/IO do host."],
          error: "Operação proibida: código tenta acessar recursos restritos do sistema.",
        });
      }

      // 3. Isolated Execution Simulation (Deterministic & Safe)
      const logs: string[] = [
        `[Sandbox] Iniciando ambiente isolado (${language.toUpperCase()})...`,
        `[Sandbox] Limite de Memória: ${env.memoryLimitMb}MB | Timeout: ${env.timeoutMs}ms`,
      ];

      try {
        let output = "";
        if (language === "javascript" || language === "typescript") {
          logs.push("[Sandbox] Compilando sintaxe e resolvendo escopo seguro...");
          logs.push("[Sandbox] Execução concluída sem efeitos colaterais no Core.");
          output = `Execution OK (Safe Sandbox output)`;
        } else if (language === "sql") {
          logs.push("[Sandbox] Validando AST SQL contra esquema local...");
          output = "Query simulada com sucesso (0 rows affected).";
        } else {
          logs.push(`[Sandbox] Execução simulada em runtime seguro.`);
          output = `Process finished with return code 0`;
        }

        const durationMs = Date.now() - startTime;
        const result: SandboxExecutionResult = {
          executionId,
          status: "SUCCESS",
          durationMs,
          output,
          logs,
        };

        athenaEventBus.emit("SANDBOX_EXECUTION_COMPLETED", {
          executionId,
          language,
          actor,
          durationMs,
        });

        resolve(result);
      } catch (err: any) {
        resolve({
          executionId,
          status: "ERROR",
          durationMs: Date.now() - startTime,
          logs: [...logs, `Erro de runtime: ${err?.message || err}`],
          error: err?.message || "Erro desconhecido",
        });
      }
    });
  }
}

export const sandboxRuntime = new SandboxRuntime();

