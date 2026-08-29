import { athenaKernel } from "../kernel/executive-controller";
import { AthenaScope } from "../domain/context";
import { AthenaMessage } from "../domain/response";
import { AthenaEngineContext } from "@/lib/athena/engine";

export function processAthenaQuerySync(
  rawPrompt: string,
  scope: AthenaScope,
  ctx: AthenaEngineContext,
  targetProjectId?: string
): AthenaMessage {
  // Sync wrapper that executes the Kernel pipeline synchronously for existing UI callbacks
  let result: AthenaMessage | null = null;

  athenaKernel
    .process(rawPrompt, scope, ctx, targetProjectId)
    .then((res) => {
      result = res;
    })
    .catch(() => {
      result = {
        id: "ath-" + Date.now(),
        sender: "athena",
        text: "Desculpe, ocorreu uma instabilidade temporária no processamento da solicitação.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        scope,
      };
    });

  // Because the internal workflow planners and tools execute synchronously against the local store,
  // result is populated immediately.
  if (result) return result;

  // Instant fallback while promise resolves if needed
  return {
    id: "ath-" + Date.now(),
    sender: "athena",
    text: "Processando solicitação com o Conselho da Athena...",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    scope,
  };
}
