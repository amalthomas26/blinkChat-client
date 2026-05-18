import { useMemo, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { useParams } from "react-router-dom";
import { ChatLayout } from "../../components/layout/ChatLayout";
import { Sidebar } from "../../components/layout/Sidebar";
import { ChatHeader } from "../../components/chat/ChatHeader";
import { MessageList } from "../../components/chat/MessageList";
import { MessageComposer } from "../../components/chat/MessageComposer";
import {
  MessageContextMenu,
  type MessageAction,
} from "../../components/chat/MessageContextMenu";
import { ForwardMessageDialog } from "../../components/chat/ForwardMessageDialog";
import { useResponsive } from "../../hooks/useResponsive";
import { useConversationRoom } from "../../hooks/useConversationRoom";
import { useMessages } from "../../hooks/useMessages";
import { useSendMessage } from "../../hooks/useSendMessage";
import {
  useConversation,
  useConversationActions,
  useTypingUsers,
} from "../../store/conversation.selectors";
import { useMessage, useMessageActions } from "../../store/message.selectors";
import { messageService } from "../../services/message.service";
import { socketService } from "../../services/socket.service";
import type { MessageDto, OptimisticMessageDto } from "../../types";
import { ImageViewer } from "../../components/chat/ImageViewer";

interface ThreadShellProps {
  conversationId?: string;
}

function ThreadShell({ conversationId }: ThreadShellProps) {
  const { isMobile } = useResponsive();
  const conversation = useConversation(conversationId ?? "");
  const typingUsers = useTypingUsers(conversationId ?? "");

  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    messageId: string;
    x: number;
    y: number;
  } | null>(null);
  const [viewerImageSrc, setViewerImageSrc] = useState<string | null>(null);

  const replyToMessage = useMessage(replyToId ?? "");
  const selectedMessage = useMessage(contextMenu?.messageId ?? "");

  const { isJoined, joinError } = useConversationRoom(conversationId);

  const {
    isLoading,
    hasMore,
    error,
    currentUserId,
    loadOlder,
    markConversationRead,
  } = useMessages(conversationId);

  const { sendMessage } = useSendMessage();
  const { deleteMessage, addReaction } = useMessageActions();
  const { updateAfterMessageDelete } = useConversationActions();

  const typingLabel = useMemo(() => {
    if (!conversation || typingUsers.size === 0) return null;
    const firstTypingUserId = Array.from(typingUsers)[0];
    const user = conversation.participants.find(
      (participant) => participant.id === firstTypingUserId,
    );
    return `${user?.name ?? "Someone"} is typing...`;
  }, [conversation, typingUsers]);

  if (!conversationId) {
    return (
      <div className="hidden flex-1 items-center justify-center bg-[#101620] md:flex">
        <div className="max-w-md space-y-4 px-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-[#8b5cf6]">
            <MessageSquareText className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-semibold text-white">
            Choose a conversation
          </h2>
          <p className="text-sm text-slate-400">
            Select a chat from the left to open the thread.
          </p>
        </div>
      </div>
    );
  }

  const handleRetry = async (message: OptimisticMessageDto) => {
    deleteMessage(message._id);
    await sendMessage({
      conversationId: message.conversationId,
      type: message.type,
      content: message.content,
      file: message.retryFile,
      audioDuration: message.audioDuration,
      replyTo: message.replyTo,
    });
  };

  const handleContextAction = async (action: MessageAction) => {
    if (!contextMenu || !selectedMessage) return;

    if (action === "reply") {
      setReplyToId(selectedMessage._id);
    }

    if (action === "copy" && selectedMessage.content) {
      void navigator.clipboard.writeText(selectedMessage.content);
    }

    if (action === "forward") {
      setForwardMessageId(selectedMessage._id);
    }

    if (action === "delete") {
      if (selectedMessage._id.startsWith("temp:")) {
        deleteMessage(selectedMessage._id);
      } else {
        const socket = socketService.getSocket();
        if (socket) {
          socket.emit(
            "delete_message",
            { messageId: selectedMessage._id },
            (res) => {
              if (res.success) {
                deleteMessage(selectedMessage._id);
                if (res.data.lastMessageChanged) {
                  updateAfterMessageDelete(
                    res.data.conversationId,
                    res.data.messageId,
                    res.data.lastMessage,
                    res.data.updatedAt,
                  );
                }
              }
            },
          );
        }
      }
    }

    if (action.startsWith("react:") && currentUserId) {
      const emoji = action.split(":")[1];
      addReaction(selectedMessage._id, currentUserId, emoji);
      await messageService.addReaction(
        selectedMessage._id,
        emoji,
        selectedMessage.conversationId,
      );
    }

    setContextMenu(null);
  };

  return (
    // h-full fills the 100dvh section provided by ChatLayout
    <div className="flex h-full flex-col bg-[#101620] text-white">
      <ChatHeader
        conversation={conversation}
        isMobile={isMobile}
        typingLabel={typingLabel}
      />

      {joinError ? (
        <div className="border-b border-rose-400/30 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">
          {joinError}
        </div>
      ) : null}

      {error ? (
        <div className="border-b border-rose-400/30 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {/* flex-1 + overflow-hidden = MessageList scrolls inside fixed height */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <MessageList
          conversationId={conversationId}
          currentUserId={currentUserId}
          typingLabel={typingLabel}
          hasMore={hasMore}
          isLoading={isLoading || !isJoined}
          onLoadOlder={loadOlder}
          onRetry={handleRetry}
          onContextMenuOpen={(messageId, x, y) =>
            setContextMenu({ messageId, x, y })
          }
          onAtBottomChange={() => undefined}
          onMarkRead={markConversationRead}
          onImageClick={(src) => setViewerImageSrc(src)}
        />
      </div>

      {/* pb-16 md:pb-0 keeps composer above the fixed mobile bottom tab bar */}
      <div className="shrink-0 pb-16 md:pb-0">
        <MessageComposer
          conversationId={conversationId}
          replyTo={(replyToMessage as MessageDto | undefined) ?? null}
          onCancelReply={() => setReplyToId(null)}
          onSend={sendMessage}
        />
      </div>

      {contextMenu ? (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          canDelete={selectedMessage?.senderId === currentUserId}
          canCopy={!!selectedMessage?.content}
          onAction={(action) => void handleContextAction(action)}
          onClose={() => setContextMenu(null)}
        />
      ) : null}

      <ForwardMessageDialog
        open={Boolean(forwardMessageId)}
        onClose={() => setForwardMessageId(null)}
        onSelectConversation={async (targetConversationId) => {
          if (!forwardMessageId) return;
          await messageService.forwardMessage({
            sourceMessageId: forwardMessageId,
            targetConversationId,
          });
          setForwardMessageId(null);
        }}
      />

      <ImageViewer
        src={viewerImageSrc}
        onClose={() => setViewerImageSrc(null)}
      />
    </div>
  );
}

export function ChatPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <ChatLayout
      selectedConversationId={id}
      sidebar={<Sidebar selectedConversationId={id} />}
      thread={<ThreadShell conversationId={id} />}
    />
  );
}
