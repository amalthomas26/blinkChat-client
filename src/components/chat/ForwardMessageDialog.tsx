import { X } from "../ui/icons";
import { useConversations } from "../../hooks/useConversations";
import type { ConversationListItemDto } from "../../types";

interface ForwardMessageDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
}

export function ForwardMessageDialog({
  open,
  onClose,
  onSelectConversation,
}: ForwardMessageDialogProps) {
  const { conversations, isInitialLoading } = useConversations();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#273244] bg-[#151b2b] text-white shadow-2xl">
        <header className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-semibold">Forward message</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-96 overflow-y-auto px-3 pb-3">
          {isInitialLoading ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Loading conversations...
            </p>
          ) : null}

          {conversations.map((conversation: ConversationListItemDto) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelectConversation(conversation.id)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2a2247] text-sm font-semibold text-[#c4b5fd]">
                {(conversation.name ?? "C").charAt(0).toUpperCase()}
              </div>
              <span className="truncate text-sm font-medium">
                {conversation.name ?? "Conversation"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
