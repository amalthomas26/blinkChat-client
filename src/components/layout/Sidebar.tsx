import { Plus, Search } from "../ui/icons";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ConversationList } from "../chat/ConversationList";
import { SearchPanel } from "../chat/SearchPanel";
import { SidebarNav } from "./SidebarNav";
import { NotificationPermissionButton } from "../notifications/NotificationPermissionButton";
import { BlinkChatLogo } from "../ui/BlinkChatLogo";

interface SidebarProps {
  selectedConversationId?: string;
}

export function Sidebar({ selectedConversationId }: SidebarProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <div className="flex h-full w-full flex-row bg-[#151b2b] text-white">
        <SidebarNav />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center justify-between border-b border-[#273244] px-4 py-4">

            {/* Brand header — logo + wordmark, links back to /chat (deselects conversation) */}
            <NavLink
              to="/chat"
              className="group flex min-w-0 shrink items-center gap-2 outline-none"
              aria-label="BlinkChat home"
            >
              <BlinkChatLogo
                size={32}
                className="shrink-0 transition-transform duration-200 group-hover:scale-105"
              />
              <span className="truncate text-lg font-bold tracking-tight text-white transition-colors group-hover:text-[#c4b5fd]">
                BlinkChat
              </span>
            </NavLink>

            <div className="flex shrink-0 items-center gap-2 pl-2">
              <NotificationPermissionButton />

              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                title="New Chat"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8b5cf6] text-white shadow-md shadow-[#8b5cf6]/20 transition-all hover:bg-[#7c3aed] hover:shadow-lg active:scale-95"
              >
                <Plus className="h-5 w-5" />
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

