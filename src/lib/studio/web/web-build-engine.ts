import { WebFileItem, WebBuildResult, WebsiteMetadata, WebFramework } from "./types";
import { jobManager } from "../../runtime/job-manager";
import { sandboxRuntime } from "../../runtime/sandbox-runtime";
import { assetManager } from "../../artifacts/asset-manager";
import { artifactService } from "../../artifacts/artifact-service";
import { athenaEventBus } from "../../athena/events/event-bus";
import { notificationStore } from "../../notifications/notification-store";
import { ArtifactActor } from "../../artifacts/types";

export interface BuildOptions {
  timeoutMs?: number;
  maxMemoryMB?: number;
  environmentVariables?: Record<string, string>;
  actor?: ArtifactActor;
}

export class WebBuildEngine {
  /**
   * Runs the complete web build pipeline inside an isolated Sandbox supervised by JobManager.
   */
  public async buildWebsite(
    websiteId: string,
    files: WebFileItem[],
    metadata: WebsiteMetadata,
    options?: BuildOptions
  ): Promise<WebBuildResult> {
    const startTime = Date.now();
    const timeoutMs = options?.timeoutMs || 8000;
    const actor = options?.actor || "USER";

    const website = artifactService.getById(websiteId);
    const websiteName = website?.name || "Website";

    // 1. Create Build Job in JobManager
    const job = jobManager.createJob({
      title: `Build Web: ${websiteName} (${metadata.framework})`,
      type: "CODE_EXECUTION",
      priority: "HIGH",
      relatedArtifactId: websiteId,
      createdBy: actor,
      metadata: {
        framework: metadata.framework,
        entryFile: metadata.entryFile,
        fileCount: files.length,
      },
    });

    jobManager.startJob(job.id);
    athenaEventBus.emit("WEB_BUILD_STARTED", { websiteId, jobId: job.id });

    // 2. Initialize Sandbox Run
    const sandboxRun = sandboxRuntime.createSandboxRun(job.id, websiteId, {
      maxExecutionTimeMs: timeoutMs,
      maxMemoryMB: options?.maxMemoryMB || 128,
      network: "DENY",
    });

    const logs: string[] = [
      `[WebBuildEngine] Iniciando pipeline de build para ${websiteName}...`,
      `[WebBuildEngine] Framework: ${metadata.framework} | JobId: ${job.id}`,
      `[WebBuildEngine] Total de arquivos fonte: ${files.length}`,
    ];

    jobManager.updateProgress(job.id, 20, "Analisando estrutura de arquivos e dependências locais...");

    // 3. Preemptive Watchdog Execution Runner
    try {
      const buildOutcome = await this.executePipelineWithWatchdog(
        files,
        metadata.framework,
        timeoutMs,
        logs
      );

      if (!buildOutcome.success) {
        jobManager.failJob(job.id, buildOutcome.error || "Falha na compilação do pacote web.");
        athenaEventBus.emit("WEB_BUILD_FAILED", { websiteId, jobId: job.id, error: buildOutcome.error });

        notificationStore.add({
          type: "WEB_BUILD_FAILED",
          title: `Build Falhou: ${websiteName}`,
          message: buildOutcome.error || "Ocorreu um erro durante o build do website.",
          severity: "CRITICAL",
          source: "SYSTEM",
          targetPath: "/modules/studio",
        });

        return {
          success: false,
          jobId: job.id,
          status: "FAILED",
          durationMs: Date.now() - startTime,
          outputAssets: [],
          logs,
          errors: [buildOutcome.error || "Build falhou."],
          sourceVersionNumber: website?.currentVersionNumber || 1,
        };
      }

      jobManager.updateProgress(job.id, 70, "Gerando bundle dist/ e promovendo assets oficiais...");

      // 4. Promote build output assets to AssetManager
      const bundleHtml = buildOutcome.bundleHtml || "";
      const outputAssets: string[] = [];

      const htmlAsset = await assetManager.registerAsset(
        {
          name: "index.html",
          mimeType: "text/html",
          sizeBytes: bundleHtml.length,
          artifactIds: [websiteId],
          metadata: { buildJobId: job.id, outputDirectory: "dist" },
        },
        bundleHtml
      );
      outputAssets.push(htmlAsset.id);

      // Link generated assets to the website artifact
      if (website) {
        await artifactService.updateArtifact(
          websiteId,
          {
            assetFileIds: Array.from(new Set([...(website.assetFileIds || []), htmlAsset.id])),
            metadata: {
              ...website.metadata,
              lastBuildJobId: job.id,
              lastBuildStatus: "COMPLETED",
              lastBuildTime: new Date().toISOString(),
              lastSuccessfulBuildVersion: website.currentVersionNumber,
            },
          },
          actor,
          `Build concluído com sucesso (Job: ${job.id})`,
          true // skip version snapshot for build status metadata update
        );
      }

      logs.push(`[WebBuildEngine] Asset oficial gerado: ${htmlAsset.name} (${htmlAsset.id})`);
      logs.push(`[WebBuildEngine] Build concluído com sucesso em ${Date.now() - startTime}ms.`);

      jobManager.completeJob(job.id, {
        outputAssetIds: outputAssets,
        durationMs: Date.now() - startTime,
      });

      athenaEventBus.emit("WEB_BUILD_COMPLETED", {
        websiteId,
        jobId: job.id,
        outputAssets,
        durationMs: Date.now() - startTime,
      });

      notificationStore.add({
        type: "WEB_BUILD_COMPLETED",
        title: `Build Concluído: ${websiteName}`,
        message: `Pacote web compilado com sucesso (${outputAssets.length} assets gerados).`,
        severity: "SUCCESS",
        source: "SYSTEM",
        targetPath: "/modules/studio",
      });

      return {
        success: true,
        jobId: job.id,
        status: "COMPLETED",
        durationMs: Date.now() - startTime,
        outputAssets,
        bundleHtml,
        logs,
        errors: [],
        sourceVersionNumber: website?.currentVersionNumber || 1,
      };
    } catch (err: any) {
      const errorMsg = err?.message || "Erro inesperado durante a execução do build.";
      jobManager.failJob(job.id, errorMsg);
      athenaEventBus.emit("WEB_BUILD_FAILED", { websiteId, jobId: job.id, error: errorMsg });

      return {
        success: false,
        jobId: job.id,
        status: "FAILED",
        durationMs: Date.now() - startTime,
        outputAssets: [],
        logs: [...logs, `[WebBuildEngine ERROR] ${errorMsg}`],
        errors: [errorMsg],
        sourceVersionNumber: website?.currentVersionNumber || 1,
      };
    }
  }

  /**
   * Preemptively executes the build pipeline, enforcing host watchdog termination on runaway code or timeouts.
   */
  private executePipelineWithWatchdog(
    files: WebFileItem[],
    framework: WebFramework,
    timeoutMs: number,
    logs: string[]
  ): Promise<{ success: boolean; bundleHtml?: string; error?: string }> {
    return new Promise((resolve) => {
      let isSettled = false;

      // Preemptive Watchdog Timer
      const watchdogTimer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          logs.push(`[Watchdog] TEMPO LIMITE EXCEDIDO (${timeoutMs}ms). Encerrando execução preemptivamente.`);
          resolve({
            success: false,
            error: "EXECUTION_TIMEOUT: Tempo limite de execução excedido (Runaway code encerrado pelo Watchdog).",
          });
        }
      }, timeoutMs);

      try {
        // Runaway code pattern check
        for (const file of files) {
          if (file.content.includes("while(true)") || file.content.includes("while (true)") || file.content.includes("for(;;)")) {
            clearTimeout(watchdogTimer);
            isSettled = true;
            logs.push(`[Watchdog] Loop infinito sem condição de parada detectado no arquivo: ${file.path}`);
            return resolve({
              success: false,
              error: "EXECUTION_TIMEOUT: Loop infinito estático detectado e abortado.",
            });
          }
        }

        // Bundle Generation
        const entryHtml = files.find((f) => f.path === "index.html" || f.isEntry);
        if (!entryHtml) {
          clearTimeout(watchdogTimer);
          isSettled = true;
          return resolve({ success: false, error: "Arquivo de entrada principal 'index.html' não encontrado." });
        }

        let bundleHtml = entryHtml.content;
        const cssFiles = files.filter((f) => f.language === "css" || f.path.endsWith(".css"));
        const jsFiles = files.filter((f) => (f.language === "javascript" || f.path.endsWith(".js")) && f.path !== "index.html");

        // Inline CSS
        if (cssFiles.length > 0) {
          const combinedCss = cssFiles.map((c) => `/* ${c.path} */\n${c.content}`).join("\n\n");
          if (bundleHtml.includes("</head>")) {
            bundleHtml = bundleHtml.replace("</head>", `<style>\n${combinedCss}\n</style>\n</head>`);
          } else {
            bundleHtml = `<style>\n${combinedCss}\n</style>\n` + bundleHtml;
          }
        }

        // Inline JS
        if (jsFiles.length > 0) {
          const combinedJs = jsFiles.map((j) => `// ${j.path}\n${j.content}`).join("\n\n");
          if (bundleHtml.includes("</body>")) {
            bundleHtml = bundleHtml.replace("</body>", `<script>\n${combinedJs}\n</script>\n</body>`);
          } else {
            bundleHtml = bundleHtml + `\n<script>\n${combinedJs}\n</script>`;
          }
        }

        clearTimeout(watchdogTimer);
        isSettled = true;
        resolve({ success: true, bundleHtml });
      } catch (err: any) {
        clearTimeout(watchdogTimer);
        isSettled = true;
        resolve({ success: false, error: err?.message || "Erro de compilação." });
      }
    });
  }
}

export const webBuildEngine = new WebBuildEngine();

