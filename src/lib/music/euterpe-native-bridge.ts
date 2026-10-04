import { Capacitor, registerPlugin } from "@capacitor/core";
import type { EuterpeVisualState } from "@/lib/music/euterpe-character";

export type EuterpeNativePlayerState = { state: EuterpeVisualState; title: string; artist: string; playing: boolean; coverDataUrl?: string };

export type EuterpeOverlayBridge = {
  checkPermission(): Promise<{ supported: boolean; granted: boolean; notificationsGranted: boolean; enabled: boolean }>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  show(options: EuterpeNativePlayerState): Promise<{ enabled: boolean; permissionRequired: boolean }>;
  update(options: EuterpeNativePlayerState): Promise<void>;
  consumePendingMusicOpen(): Promise<{ pending: boolean }>;
  addListener(eventName: "mediaAction", listener: (event: { action?: "open" | "play" | "pause" | "previous" | "next" }) => void): Promise<{ remove(): Promise<void> }>;
  hide(): Promise<void>;
};

const euterpeOverlayPlugin = registerPlugin<EuterpeOverlayBridge>("EuterpeOverlay");

export function getEuterpeOverlayBridge(): EuterpeOverlayBridge | undefined {
  if (typeof window === "undefined" || Capacitor.getPlatform() !== "android") return undefined;
  return euterpeOverlayPlugin;
}
