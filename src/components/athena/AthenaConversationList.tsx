"use client";

import { Archive, MessageSquare, Plus, Search, Trash2, X } from "lucide-react";
import type { AthenaConversation } from "@/lib/athena/conversation/conversation-store";

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
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-[#1e1e30] bg-[#0a0a0f]" aria-label="Conversas da Athena">
      <div className="flex items-center gap-2 border-b border-[#1e1e30] p-3">
        <button onClick={onCreate} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-500">
          <Plus size={14} /> Nova conversa
        </button>
        {onCloseMobile && <button aria-label="Fechar lista" onClick={onCloseMobile} className="p-2 text-slate-400 md:hidden"><X size={16} /></button>}
      </div>
      <div className="p-3">
        <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[#25253a] bg-[#11111b] px-2 text-slate-500">
          <Search size={13} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar conversas" className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600" />
        </label>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {!conversations.length && <p className="px-3 py-6 text-center text-xs text-slate-500">Nenhuma conversa encontrada.</p>}
        {conversations.map((conversation) => {
          const active = conversation.id === activeConversationId;
          return <div key={conversation.id} className={`group rounded-xl border p-2 ${active ? "border-violet-500/40 bg-violet-500/10" : "border-transparent hover:border-[#25253a] hover:bg-[#11111b]"}`}>
            <button onClick={() => onSelect(conversation.id)} className="block w-full text-left">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-200"><MessageSquare size={12} className="shrink-0 text-violet-300" /><span className="truncate">{conversation.title}</span></span>
              <span className="mt-1 block truncate pl-5 text-[10px] text-slate-500">{conversation.preview}</span>
              <span className="mt-1 block pl-5 text-[9px] text-slate-600">{conversation.messageCount} mensagens · {new Date(conversation.lastMessageAt).toLocaleDateString("pt-BR")}</span>
            </button>
            <div className="mt-1 hidden justify-end gap-1 group-hover:flex focus-within:flex">
              <button onClick={() => onArchive(conversation.id)} aria-label={`Arquivar ${conversation.title}`} className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-slate-300"><Archive size={12} /></button>
              <button onClick={() => onTrash(conversation.id)} aria-label={`Excluir ${conversation.title}`} className="rounded p-1 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 size={12} /></button>
            </div>
          </div>;
        })}
      </div>
    </aside>
  );
}
