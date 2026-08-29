"use client";

import React from "react";
import { DocumentHeading } from "@/lib/studio/document/types";
import { Hash } from "lucide-react";

interface DocumentOutlineProps {
  outline: DocumentHeading[];
  onSelectHeading?: (heading: DocumentHeading) => void;
}

export function DocumentOutline({ outline, onSelectHeading }: DocumentOutlineProps) {
  return (
    <div className="p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between pb-2 border-b border-[#1c1c2e]">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Estrutura (Outline)</span>
        <span className="text-[10px] text-slate-500 bg-[#161626] px-1.5 py-0.5 rounded">{outline.length} títulos</span>
      </div>

      {outline.length === 0 ? (
        <p className="text-xs text-slate-500 italic mt-2">
          Nenhum título identificado. Utilize `#`, `##` ou `###` para estruturar seu texto.
        </p>
      ) : (
        <div className="flex flex-col gap-1 mt-1">
          {outline.map((heading) => (
            <button
              key={heading.id}
              onClick={() => onSelectHeading && onSelectHeading(heading)}
              className="text-left py-1 px-2 rounded hover:bg-[#181828] text-slate-300 hover:text-white text-xs truncate flex items-center gap-1.5 transition"
              style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
            >
              <Hash size={11} className="text-blue-400 shrink-0" />
              <span className="truncate">{heading.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

