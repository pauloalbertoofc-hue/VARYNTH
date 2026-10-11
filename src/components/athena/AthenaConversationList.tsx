"use client";

import { Archive, MessageSquare, Plus, Search, Trash2, X } from "lucide-react";
import type { AthenaConversation } from "@/lib/athena/conversation/conversation-store";
import { StatePanel } from "@/components/ui/StatePanel";

interface Props {
  conversations: AthenaConversation[];
  activeConversationId?: string;
  query: string;
  onQueryChange: (value: string) => void;
  onCreate: () => void;
  onSelect: (conversationId: string) => void;
  onArchive: (conversationId: string) => void;
  onTrash: (conversationId: string) => void;
  onCloseMobile?: () => void;
}

export function AthenaConversationList({ conversations, activeConversationId, query, onQueryChange, onCreate, onSelect, onArchive, onTrash, onCloseMobile }: Props) {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-[var(--vly-border-subtle)] bg-[var(--vly-world)]" aria-label="Conversas da Athena">
      <div className="flex items-center gap-2 border-b border-[var(--vly-border-subtle)] p-3">
        <button onClick={onCreate} className="vly-interactive flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--vly-accent)] px-3 text-xs font-bold text-[var(--vly-accent-contrast)] hover:bg-[var(--vly-accent-hover)]">
          <Plus size={14} /> Nova conversa
        </button>
        {onCloseMobile && <button aria-label="Fechar lista" onClick={onCloseMobile} className="vly-interactive p-2 text-[var(--vly-text-muted)] md:hidden"><X size={16} /></button>}
      </div>
      <div className="p-3">
        <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2 text-[var(--vly-text-muted)]">
          <Search size={13} /><input aria-label="Buscar conversas" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar conversas" className="vly-field min-h-0 min-w-0 flex-1 border-0 bg-transparent px-0 text-xs" />
        </label>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {!conversations.length && <StatePanel tone="empty" title="Nenhuma conversa encontrada" className="m-2 border-0 bg-transparent px-2 py-6" />}
        {conversations.map((conversation) => {
          const active = conversation.id === activeConversationId;
          return <div key={conversation.id} className={`group rounded-xl border p-2 ${active ? "border-[var(--vly-border-accent)] bg-[var(--vly-surface-active)]" : "border-transparent hover:border-[var(--vly-border-default)] hover:bg-[var(--vly-surface-raised)]"}`}>
            <button onClick={() => onSelect(conversation.id)} className="vly-interactive block w-full text-left">
              <span className="flex items-center gap-2 text-xs font-semibold text-[var(--vly-text-secondary)]"><MessageSquare size={12} className="shrink-0 text-[var(--vly-accent)]" /><span className="truncate">{conversation.title}</span></span>
              <span className="mt-1 block truncate pl-5 text-[10px] text-[var(--vly-text-muted)]">{conversation.preview}</span>
              <span className="mt-1 block pl-5 text-[9px] text-[var(--vly-text-disabled)]">{conversation.messageCount} mensagens · {new Date(conversation.lastMessageAt).toLocaleDateString("pt-BR")}</span>
            </button>
            <div className="mt-1 hidden justify-end gap-1 group-hover:flex focus-within:flex">
              <button onClick={() => onArchive(conversation.id)} aria-label={`Arquivar ${conversation.title}`} className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-secondary)]"><Archive size={12} /></button>
              <button onClick={() => onTrash(conversation.id)} aria-label={`Excluir ${conversation.title}`} className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] hover:bg-[color-mix(in_srgb,var(--vly-danger)_12%,var(--vly-surface))] hover:text-[var(--vly-danger)]"><Trash2 size={12} /></button>
            </div>
          </div>;
        })}
      </div>
    </aside>
  );
}
