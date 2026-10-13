export type CameraMode = "AUTO" | "SMART" | "PRO" | "DOCUMENT" | "VIDEO" | "STUDIO";

export type CameraModeProfile = {
  mode: CameraMode;
  label: string;
  description: string;
  constraints: MediaStreamConstraints;
  requiresHardwareControls: boolean;
};

export function getCameraModeProfile(mode: CameraMode): CameraModeProfile {
  switch (mode) {
    case "SMART":
      return { mode, label: "SMART", description: "Aquisição contextual com vídeo real; análise avançada permanece local e explícita.", constraints: { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }, requiresHardwareControls: false };
    case "PRO":
      return { mode, label: "PRO", description: "Solicita a melhor resolução exposta pelo dispositivo sem inventar controles manuais.", constraints: { video: { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 } }, audio: false }, requiresHardwareControls: true };
    case "DOCUMENT":
      return { mode, label: "DOCUMENT", description: "Captura orientada a documentos e superfícies planas.", constraints: { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }, requiresHardwareControls: false };
    case "VIDEO":
      return { mode, label: "VIDEO", description: "Captura audiovisual conforme o track disponível.", constraints: { video: { facingMode: { ideal: "environment" }, frameRate: { ideal: 30 } }, audio: true }, requiresHardwareControls: false };
    case "STUDIO":
      return { mode, label: "STUDIO", description: "Captura com intenção de continuidade para o Visual Studio.", constraints: { video: { facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1440 } }, audio: false }, requiresHardwareControls: false };
    case "AUTO":
    default:
      return { mode: "AUTO", label: "AUTO", description: "Captura simples e confiável; em celulares solicita a câmera traseira e aceita fallback do dispositivo.", constraints: { video: { facingMode: { ideal: "environment" } }, audio: false }, requiresHardwareControls: false };
  }
}

