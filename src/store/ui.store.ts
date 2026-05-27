import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "system";
export type FontSize = "normal" | "large";

export interface UIState {
  activeChatId: string | null;
  isMobileView: boolean;
  showSidebar: boolean;
  searchQuery: string;
  theme: Theme;
  fontSize: FontSize;
}

export interface UIActions {
  setActiveChat: (id: string | null) => void;
  toggleSidebar: () => void;
  setMobileView: (isMobile: boolean) => void;
  setSearchQuery: (query: string) => void;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
}

export type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      activeChatId: null,
      isMobileView: false,
      showSidebar: true,
      searchQuery: "",
      theme: "dark",
      fontSize: "normal",

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

      setTheme: (theme) => set({ theme }),

      setFontSize: (size) => set({ fontSize: size }),
    }),
    {
      name: "blinkchat-ui",
      // Only persist theme and fontSize — don't persist
      // activeChatId/sidebar state across page reloads
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
      }),
    },
  ),
);
