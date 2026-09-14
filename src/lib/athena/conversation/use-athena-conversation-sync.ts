"use client";

import { useEffect, useRef, useState } from "react";
import { ATHENA_CONVERSATIONS_EVENT } from "./conversation-store";
import { syncAthenaConversations, type AthenaConversationSyncStatus } from "./conversation-sync-client";

export function useAthenaConversationSync() {
  const [status, setStatus] = useState<AthenaConversationSyncStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const sync = () => {
      setStatus("syncing");
      void syncAthenaConversations().then(setStatus);
    };
    const schedule = (event?: Event) => {
      if (event instanceof CustomEvent && event.detail?.source === "remote") return;
      clearTimeout(timer.current);
      timer.current = setTimeout(sync, 700);
    };
    sync();
    window.addEventListener(ATHENA_CONVERSATIONS_EVENT, schedule);
    window.addEventListener("online", sync);
    const visibility = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener(ATHENA_CONVERSATIONS_EVENT, schedule);
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return status;
}
