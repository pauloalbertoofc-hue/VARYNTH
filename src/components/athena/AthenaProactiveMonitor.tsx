"use client";

import { useEffect, useRef } from "react";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { athenaProactiveMonitor } from "@/lib/athena/insights/proactive-monitor";

export function AthenaProactiveMonitor() {
  const store = useVarynthStore();
  const latest = useRef(store);
  latest.current = store;

  useEffect(() => {
    if (!store.isLoaded) return;
    athenaProactiveMonitor.scan(store);
    const timer = window.setInterval(() => athenaProactiveMonitor.scan(latest.current), 60_000);
    return () => window.clearInterval(timer);
  }, [store.isLoaded]);

  return null;
}
