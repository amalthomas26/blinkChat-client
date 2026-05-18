import { create } from "zustand";

export interface UIState {
  activeChatId: string | null;
  isMobileView: boolean;
  showSidebar: boolean;
  searchQuery: string;
}

export interface UIActions {
  setActiveChat: (id: string | null) => void;
  toggleSidebar: () => void;
  setMobileView: (isMobile: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()((set) => ({
  activeChatId: null,
  isMobileView: false,
  showSidebar: true,
  searchQuery: "",

  setActiveChat: (id) =>
    set((s) => ({
      activeChatId: id,
      showSidebar: s.isMobileView ? false : s.showSidebar,
    })),

  toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),

  setMobileView: (isMobile) =>
    set((s) => ({
      isMobileView: isMobile,
      showSidebar: isMobile ? s.showSidebar : true,
    })),

  setSearchQuery: (query) => set({ searchQuery: query }),
}));
