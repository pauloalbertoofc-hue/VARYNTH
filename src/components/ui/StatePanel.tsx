import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Inbox, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type StatePanelTone = "loading" | "empty" | "success" | "error";

interface StatePanelProps {
  tone: StatePanelTone;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const toneConfig = {
  loading: { icon: LoaderCircle, color: "text-[var(--vly-text-muted)]", iconClass: "vly-motion-loading" },
  empty: { icon: Inbox, color: "text-[var(--vly-text-muted)]", iconClass: "" },
  success: { icon: CheckCircle2, color: "text-[var(--vly-success)]", iconClass: "" },
  error: { icon: AlertTriangle, color: "text-[var(--vly-danger)]", iconClass: "" },
} satisfies Record<StatePanelTone, { icon: typeof LoaderCircle; color: string; iconClass: string }>;

export function StatePanel({ tone, title, description, action, className }: StatePanelProps) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex min-h-28 flex-col items-center justify-center rounded-[var(--vly-radius-md)] border border-dashed border-[var(--vly-border-default)] px-5 py-6 text-center",
        "bg-[color-mix(in_srgb,var(--vly-surface)_72%,transparent)]",
        "vly-enter",
        tone === "success" && "vly-motion-success",
        tone === "error" && "vly-motion-error",
        className
      )}
    >
      <Icon size={20} aria-hidden="true" className={cn("mb-2", config.color, config.iconClass)} />
      <p className="text-xs font-semibold text-[var(--vly-text-secondary)]">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-[var(--vly-text-muted)]">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
