import { MessageSquareText, Settings } from "../ui/icons";
import { NavLink } from "react-router-dom";
import { useAuthUser } from "../../store/auth.selectors";
import { cn } from "../../lib/utils";
import { BlinkChatLogo } from "../ui/BlinkChatLogo";

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex h-11 w-11 items-center justify-center rounded-2xl border text-slate-400 transition-colors",
    isActive
      ? "border-[#8b5cf6] bg-[#8b5cf6]/15 text-[#c4b5fd]"
      : "border-transparent bg-transparent hover:bg-white/5 hover:text-white",
  );

const mobileNavLinkClassName = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex flex-col items-center gap-1 px-4 py-1 text-xs transition-colors",
    isActive ? "text-[#c4b5fd]" : "text-slate-400",
  );

export function SidebarNav() {
  const user = useAuthUser();
  const userInitial = user?.name?.charAt(0).toUpperCase() ?? "U";

  return (
    <>
      
      <div className="hidden w-24 shrink-0 border-r border-[#273244] bg-[#101620] md:flex md:flex-col md:items-center md:justify-between md:py-6">
        <div className="flex flex-col items-center gap-6">

          <NavLink
            to="/chat"
            className="group flex flex-col items-center gap-1.5 outline-none"
            aria-label="BlinkChat home"
          >
            <BlinkChatLogo
              size={38}
              animated
              className="transition-transform duration-200 group-hover:scale-110"
            />
            <span className="select-none text-[10px] font-bold tracking-[0.14em] text-[#c4b5fd] uppercase transition-colors group-hover:text-white">
              BlinkChat
            </span>
          </NavLink>

          <div className="flex flex-col gap-4">
            <NavLink to="/chat" className={navLinkClassName}>
              <MessageSquareText className="h-5 w-5" />
            </NavLink>

            <NavLink to="/settings" className={navLinkClassName}>
              <Settings className="h-5 w-5" />
            </NavLink>
          </div>
        </div>

        <NavLink
          to="/profile"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2a2247] text-sm font-semibold text-[#c4b5fd] transition-opacity hover:opacity-80 overflow-hidden"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" />
          ) : (
            userInitial
          )}
        </NavLink>
      </div>

      {/* ── Mobile: horizontal bottom tab bar ───────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[#273244] bg-[#101620] px-4 py-2 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
      >
        {/* Logo replaces the generic Chats tab icon on mobile */}
        <NavLink to="/chat" className={mobileNavLinkClassName}>
          {({ isActive }) => (
            <>
              <BlinkChatLogo size={26} animated={isActive} />
              <span>Home</span>
            </>
          )}
        </NavLink>

        <NavLink to="/settings" className={mobileNavLinkClassName}>
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </NavLink>

        <NavLink to="/profile" className="flex flex-col items-center gap-1 px-4 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a2247] text-sm font-semibold text-[#c4b5fd] overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              userInitial
            )}
          </div>
        </NavLink>
      </nav>
    </>
  );
}

