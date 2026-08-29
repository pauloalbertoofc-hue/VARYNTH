"use client";

import { useState, useEffect, useCallback } from "react";
import { ollamaAdapter, DetectedLocalRuntime } from "../models/providers/ollama-adapter";

export interface AthenaEngineStatusState {
  isLocalNeuralActive: boolean;
  activeModel?: string;
  installedModels: string[];
  endpoint: string;
  isChecking: boolean;
  lastChecked?: string;
  engineName: string;
  engineDescription: string;
  checkStatus: () => Promise<void>;
  selectModel: (modelName: string) => void;
}

export function useAthenaEngineStatus(): AthenaEngineStatusState {
  const [runtime, setRuntime] = useState<DetectedLocalRuntime>({
    isAvailable: false,
    endpoint: "http://127.0.0.1:11434",
    installedModels: [],
    lastChecked: new Date().toISOString(),
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const detected = await ollamaAdapter.autoDetect();
      setRuntime(detected);
    } catch {
      setRuntime({
        isAvailable: false,
        endpoint: "http://127.0.0.1:11434",
        installedModels: [],
        lastChecked: new Date().toISOString(),
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  const selectModel = useCallback((modelName: string) => {
    ollamaAdapter.activeModel = modelName;
    setRuntime((prev) => ({ ...prev, activeModel: modelName }));
  }, []);

  useEffect(() => {
    checkStatus();
    // Re-check periodically every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const isLocalNeuralActive = runtime.isAvailable && Boolean(runtime.activeModel);

  return {
    isLocalNeuralActive,
    activeModel: runtime.activeModel,
    installedModels: runtime.installedModels,
    endpoint: runtime.endpoint,
    isChecking,
    lastChecked: runtime.lastChecked,
    engineName: isLocalNeuralActive
      ? `Athena Neural Engine (${runtime.activeModel})`
      : "Athena Deterministic Core",
    engineDescription: isLocalNeuralActive
      ? `Inferência Neural 100% Local via Ollama (${runtime.endpoint})`
      : "Processamento Determinístico Offline (R$ 0 API)",
    checkStatus,
    selectModel,
  };
}

