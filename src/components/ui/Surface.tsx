import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SurfaceTone = "panel" | "raised" | "floating";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: SurfaceTone;
}

const toneClasses: Record<SurfaceTone, string> = {
  panel: "bg-[var(--vly-surface)] border-[var(--vly-border-subtle)]",
  raised: "bg-[var(--vly-surface-raised)] border-[var(--vly-border-default)]",
  floating: "bg-[var(--vly-surface-floating)] border-[var(--vly-border-strong)] shadow-[0_18px_50px_rgb(0_0_0_/_24%)]",
};

/** Shared material primitive. Keep composition and behavior with the caller. */
export function Surface({ tone = "panel", className, ...props }: SurfaceProps) {
  return (
    <div
      {...props}
      className={cn(
        "border transition-[background-color,border-color,box-shadow] duration-[var(--vly-motion-standard)]",
        toneClasses[tone],
        className
      )}
    />
  );
}
