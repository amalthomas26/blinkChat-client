import type { ReactNode } from "react";
import { useResponsive } from "../../hooks/useResponsive";

interface ChatLayoutProps {
  selectedConversationId?: string;
  sidebar: ReactNode;
  thread: ReactNode;
}

export function ChatLayout({
  selectedConversationId,
  sidebar,
  thread,
}: ChatLayoutProps) {
  const { isMobile } = useResponsive();
  // On mobile: show thread when a conversation is selected, else show sidebar
  const showThread = !isMobile || Boolean(selectedConversationId);
  const showSidebar = !isMobile || !selectedConversationId;

  return (
    <div
      className="flex bg-[#0b0f19] text-white"
      style={{
        height: "100dvh",
        // Honour iOS notch / Android nav-bar safe areas
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {showSidebar && (
        <aside className="flex w-full shrink-0 flex-col md:w-[360px] md:max-w-[520px] md:border-r md:border-[#273244]">
          {sidebar}
        </aside>
      )}

      {showThread && (
        <section
          className="flex min-w-0 flex-1 flex-col bg-[#101620]"
          style={{ height: "100dvh" }}
        >
          {thread}
        </section>
      )}
    </div>
  );
}
