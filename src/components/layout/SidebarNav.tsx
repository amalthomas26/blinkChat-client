import { House, MessageSquareText, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuthUser } from "../../store/auth.selectors";
import { cn } from "../../lib/utils";

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex h-11 w-11 items-center justify-center rounded-2xl border text-slate-400 transition-colors",
    isActive
      ? "border-[#8b5cf6] bg-[#8b5cf6]/15 text-[#c4b5fd]"
      : "border-transparent bg-transparent hover:bg-white/5 hover:text-white",
  );

export function SidebarNav() {
  const user = useAuthUser();
  const userInitial = user?.name?.charAt(0).toUpperCase() ?? "U";

  return (
    <>
      {/* Desktop: vertical left rail */}
      <div className="hidden w-24 shrink-0 border-r border-[#273244] bg-[#101620] md:flex md:flex-col md:items-center md:justify-between md:py-6">
        <div className="flex flex-col items-center gap-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/20">
            <House className="h-5 w-5" />
          </div>

          <div className="flex flex-col gap-4">
            <NavLink to="/chat" className={navLinkClassName}>
              <MessageSquareText className="h-5 w-5" />
            </NavLink>

            <button
              type="button"
              disabled
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2a2247] text-sm font-semibold text-[#c4b5fd]">
          {userInitial}
        </div>
      </div>

      {/* Mobile: horizontal bottom tab bar — pinned to bottom of sidebar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[#273244] bg-[#101620] px-4 py-2 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
      >
        <NavLink
          to="/chat"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1 px-4 py-1 text-xs transition-colors",
              isActive ? "text-[#c4b5fd]" : "text-slate-400",
            )
          }
        >
          <MessageSquareText className="h-5 w-5" />
          <span>Chats</span>
        </NavLink>

        <button
          type="button"
          disabled
          className="flex flex-col items-center gap-1 px-4 py-1 text-xs text-slate-600"
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </button>

        <div className="flex flex-col items-center gap-1 px-4 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a2247] text-sm font-semibold text-[#c4b5fd]">
            {userInitial}
          </div>
        </div>
      </nav>
    </>
  );
}
