import { create } from "zustand";

export interface PresenceState {
  onlineUsers: Set<string>;
}

export interface PresenceActions {
  setOnline: (userId: string) => void;
  setOffline: (userId: string) => void;

  bulkSetPresence: (userIds: string[]) => void;
}
export type PresenceStore = PresenceState & PresenceActions;

export const usePresenceStore = create<PresenceStore>()((set) => ({
  onlineUsers: new Set<string>(),

  setOnline: (userId) =>
    set((s) => ({ onlineUsers: new Set(s.onlineUsers).add(userId) })),

  setOffline: (userId) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),

  bulkSetPresence: (userIds) => set({ onlineUsers: new Set(userIds) }),
}));
