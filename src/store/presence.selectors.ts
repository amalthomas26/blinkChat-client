import { usePresenceStore } from "./presence.store";
import { useShallow } from "zustand/react/shallow";

export const useIsOnline = (userId: string) =>
  usePresenceStore((s) => s.onlineUsers.has(userId));

export const useOnlineUsers = () => usePresenceStore((s) => s.onlineUsers);

export const usePresenceActions = () =>
  usePresenceStore(
    useShallow((s) => ({
      setOnline: s.setOnline,
      setOffline: s.setOffline,
      bulkSetPresence: s.bulkSetPresence,
    }))
  );
