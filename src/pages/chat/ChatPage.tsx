import { useMemo, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { ChatLayout } from "../../components/layout/ChatLayout";
import { Sidebar } from "../../components/layout/Sidebar";
import { ChatHeader } from "../../components/chat/ChatHeader";
import { MessageSearchBar } from "../../components/chat/MessageSearchBar";
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
import { useMessageSearch } from "../../hooks/useMessageSearch";
import { useSendMessage } from "../../hooks/useSendMessage";
import {
  useConversation,
  useConversationActions,
  useTypingUsers,
} from "../../store/conversation.selectors";
import { useMessage, useMessageActions } from "../../store/message.selectors";
import { useMessageStore } from "../../store/message.store";
import { messageService } from "../../services/message.service";
import { conversationService } from "../../services/conversation.service";
import { socketService } from "../../services/socket.service";
import { useConversationStore } from "../../store/conversation.store";
import type { MessageDto, OptimisticMessageDto } from "../../types";
import { ImageViewer } from "../../components/chat/ImageViewer";
import {useActiveConversationNotification} from "../../hooks/useActiveConversationNotification";


import type { ConversationListUserDto } from "../../types";

const EMPTY_PARTICIPANTS: ConversationListUserDto[] = [];

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const replyToMessage = useMessage(replyToId ?? "");
  const selectedMessage = useMessage(contextMenu?.messageId ?? "");

  useActiveConversationNotification(conversationId);

  const { isJoined, joinError } = useConversationRoom(conversationId);

  const messageSearch = useMessageSearch(conversationId);

  const {
    isLoading,
    hasMore,
    error,
    currentUserId,
    loadOlder,
    markConversationRead,
  } = useMessages(conversationId);

  const { sendMessage } = useSendMessage();
  const {
    deleteMessage,
    addReaction,
    removeReaction,
    clearConversationMessages,
  } = useMessageActions();
  const {
    updateAfterMessageDelete,
    toggleMute,
    togglePin,
  } = useConversationActions();
  const navigate = useNavigate();

  const handleMuteToggle = async () => {
    if (!conversation || !conversationId) return;
    const nextMuted = !conversation.isMuted;
    toggleMute(conversationId, nextMuted);
    try {
      if (nextMuted) {
        await conversationService.muteConversation(conversationId);
      } else {
        await conversationService.unmuteConversation(conversationId);
      }
    } catch {
      toggleMute(conversationId, !nextMuted);
    }
  };

  const handlePinToggle = async () => {
    if (!conversation || !conversationId) return;
    const nextPinned = !conversation.isPinned;
    togglePin(conversationId, nextPinned);
    try {
      if (nextPinned) {
        await conversationService.pinConversation(conversationId);
      } else {
        await conversationService.unpinConversation(conversationId);
      }
    } catch {
      togglePin(conversationId, !nextPinned);
    }
  };

  const handleClearChat = () => {
    if (!conversationId) return;
    clearConversationMessages(conversationId);
  };

  const handleDeleteChat = async () => {
    if (!conversationId) return;
    setIsDeletingChat(true);
    try {
      await conversationService.deleteConversation(conversationId);
      clearConversationMessages(conversationId);
      useConversationStore.getState().removeConversation(conversationId);
      navigate("/chat");
    } catch (err) {
      console.error("Failed to delete chat", err);
    } finally {
      setIsDeletingChat(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleGroupInfo = () => {
    navigate(`/chat/${conversationId}/info`);
  };

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
      await handleReactionToggle(selectedMessage._id, emoji);
    }

    setContextMenu(null);
  };

  const handleReactionToggle = async (messageId: string, emoji: string) => {
    if (!currentUserId) return;
    const msg = useMessageStore.getState().byId[messageId];
    if (!msg) return;
    const alreadyReacted = msg.reactions?.some(
      (r) => r.userId === currentUserId && r.emoji === emoji,
    );

    if (alreadyReacted) {
      removeReaction(messageId, currentUserId);
      try {
        await messageService.removeReaction(messageId, msg.conversationId);
      } catch {
        // Rollback — re-add the reaction the user tried to remove
        addReaction(messageId, currentUserId, emoji);
      }
    } else {
      addReaction(messageId, currentUserId, emoji);
      try {
        await messageService.addReaction(messageId, emoji, msg.conversationId);
      } catch {
        // Rollback — remove the optimistically added reaction
        removeReaction(messageId, currentUserId);
      }
    }
  };

  return (
    // h-full fills the 100dvh section provided by ChatLayout
    <div className="flex h-full flex-col bg-[#101620] text-white">
      {isSearchOpen ? (
        <MessageSearchBar
          query={messageSearch.query}
          currentIndex={messageSearch.currentIndex}
          totalCount={messageSearch.totalCount}
          isSearching={messageSearch.isSearching}
          onQueryChange={messageSearch.search}
          onNext={messageSearch.goToNext}
          onPrev={messageSearch.goToPrev}
          onClose={() => {
            setIsSearchOpen(false);
            messageSearch.reset();
          }}
        />
      ) : (
        <ChatHeader
          conversation={conversation}
          isMobile={isMobile}
          typingLabel={typingLabel}
          onMuteToggle={handleMuteToggle}
          onPinToggle={handlePinToggle}
          onClearChat={handleClearChat}
          onDeleteChat={() => setShowDeleteConfirm(true)}
          onGroupInfo={handleGroupInfo}
          onSearchOpen={() => setIsSearchOpen(true)}
        />
      )}

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
          participants={conversation?.participants ?? EMPTY_PARTICIPANTS}
          typingLabel={typingLabel}
          hasMore={hasMore}
          isLoading={isLoading || !isJoined}
          highlightedMessageId={messageSearch.currentMessageId}
          onLoadOlder={loadOlder}
          onRetry={handleRetry}
          onContextMenuOpen={(messageId, x, y) =>
            setContextMenu({ messageId, x, y })
          }
          onAtBottomChange={() => undefined}
          onMarkRead={markConversationRead}
          onReactionToggle={handleReactionToggle}
          onImageClick={(src) => setViewerImageSrc(src)}
        />
      </div>

      
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

      {/* Delete chat confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#273244] bg-[#101620] p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white">Delete Chat?</h3>
            <p className="mt-2 text-sm text-slate-400">
              This will permanently delete this conversation for you. The other
              person won&apos;t be notified.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => void handleDeleteChat()}
                disabled={isDeletingChat}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeletingChat ? "Deleting…" : "Yes, Delete"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingChat}
                className="flex-1 rounded-xl bg-white/5 py-2.5 text-sm text-slate-300 transition hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ChatPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <ChatLayout
      selectedConversationId={id}
      sidebar={<Sidebar selectedConversationId={id} />}
      thread={<ThreadShell key={id} conversationId={id} />}
    />
  );
}
