import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { ConversationList } from "../chat/ConversationList";
import { SearchPanel } from "../chat/SearchPanel";
import { SidebarNav } from "./SidebarNav";
import { NotificationPermissionButton } from "../notifications/NotificationPermissionButton";

interface SidebarProps {
  selectedConversationId?: string;
}

export function Sidebar({ selectedConversationId }: SidebarProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <div className="flex h-full w-full flex-col bg-[#151b2b] text-white">
        <SidebarNav />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center justify-between border-b border-[#273244] px-4 py-5 md:px-6">
            <h1 className="text-3xl font-bold tracking-tight">Chats</h1>

            <div className="flex items-center gap-2">
              <NotificationPermissionButton />

              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#8b5cf6] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#7c3aed] active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>New Chat</span>
              </button>
            </div>
          </header>

          <div className="shrink-0 border-b border-[#273244] px-4 py-4 md:px-6">
            <div className="flex h-11 items-center gap-3 rounded-2xl border border-[#273244] bg-[#101620] px-4 focus-within:border-[#8b5cf6] focus-within:ring-1 focus-within:ring-[#8b5cf6]">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                placeholder="Search conversations..."
                className="h-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* This div must overflow-y-auto so ConversationList scrolls within the fixed height */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <ConversationList
              filterQuery={filterQuery}
              selectedConversationId={selectedConversationId}
            />
          </div>
        </div>
      </div>

      <SearchPanel open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
