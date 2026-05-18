import { useShallow } from "zustand/react/shallow";
import { useUIStore } from "./ui.store";

export const useActiveChatId = () => useUIStore((s) => s.activeChatId);
export const useIsMobileView = () => useUIStore((s) => s.isMobileView);
export const useShowSidebar = () => useUIStore((s) => s.showSidebar);
export const useSearchQuery = () => useUIStore((s) => s.searchQuery);

export const useUIActions = () =>
  useUIStore(
    useShallow((s) => ({
      setActiveChat: s.setActiveChat,
      toggleSidebar: s.toggleSidebar,
      setMobileView: s.setMobileView,
      setSearchQuery: s.setSearchQuery,
    })),
  );
