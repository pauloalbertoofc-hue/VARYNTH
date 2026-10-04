"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getEuterpeOverlayBridge } from "@/lib/music/euterpe-native-bridge";

/** Routes notification taps to Music, including cold app launches before the page listener exists. */
export function EuterpeNativeOpenHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const handled = useRef(false);

  useEffect(() => {
    const bridge = getEuterpeOverlayBridge();
    if (!bridge) return;
    if (pathname !== "/modules/music") handled.current = false;
    let active = true;
    let listener: { remove(): Promise<void> } | undefined;
    const openMusic = () => {
      if (!active || handled.current) return;
      handled.current = true;
      if (pathname !== "/modules/music") router.push("/modules/music");
    };

    void bridge.addListener("mediaAction", ({ action }) => {
      if (action === "open") openMusic();
    }).then((handle) => {
      if (active) listener = handle;
      else void handle.remove();
    }).catch(() => undefined);

    void bridge.consumePendingMusicOpen().then(({ pending }) => {
      if (pending) openMusic();
    }).catch(() => undefined);

    return () => {
      active = false;
      if (listener) void listener.remove();
    };
  }, [pathname, router]);

  return null;
}
