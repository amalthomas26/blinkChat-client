import { Search, Users, X } from "../ui/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { UserSearchResultDto } from "../../types";
import { userService } from "../../services/user.service";
import { conversationService } from "../../services/conversation.service";
import { useDebounce } from "../../hooks/useDebounce";
import { useConversationActions } from "../../store/conversation.selectors";
import { ApiError } from "../../lib/api";
import { lazy, Suspense } from "react";
const CreateGroupModal = lazy(() => import("./CreateGroupModal").then(m => ({ default: m.CreateGroupModal })));

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SearchPanel({ open, onClose }: SearchPanelProps) {
  const navigate = useNavigate();
  const { upsertConversation } = useConversationActions();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResultDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);


  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!open) return;

    const trimmedQuery = debouncedQuery.trim();
    if (!trimmedQuery) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    userService
      .searchUser(trimmedQuery, controller.signal)
      .then((response) => {
        setResults(response.data.users);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;

        const message =
          err instanceof ApiError ? err.message : "Failed to search users";

        setResults([]);
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, open]);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setResults([]);
      setError(null);
      setIsLoading(false);
      setPendingUserId(null);
    }
  }, [open]);

  if (!open) return null;

  const handleStartConversation = async (user: UserSearchResultDto) => {
    if (pendingUserId) return;

    try {
      setPendingUserId(user.id);
      setError(null);

      const startResponse = await conversationService.startConversation(
        user.id,
      );
      const conversationId = startResponse.data.conversationId;

      const conversationResponse =
        await conversationService.getConversation(conversationId);

      upsertConversation(conversationResponse.data);
      navigate(`/chat/${conversationId}`);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "Failed to start conversation";
      setError(message);
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[600px] rounded-3xl border border-[#273244] bg-[#151b2b] text-white shadow-2xl"
      >
        <header className="flex items-center justify-between px-6 py-5">
          <h2 className="text-2xl font-semibold">New Chat</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={() => setShowCreateGroup(true)}
            className="mb-5 flex h-11 w-full items-center gap-3 rounded-2xl border border-[#273244] bg-[#101620] px-4 text-left text-sm font-medium text-white"
          >
            <Users className="h-4 w-4 text-slate-400" />
            Create Group
          </button>

          <div className="flex h-11 items-center gap-3 rounded-2xl border border-[#273244] bg-[#101620] px-4 focus-within:border-[#8b5cf6] focus-within:ring-1 focus-within:ring-[#8b5cf6]">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users..."
              className="h-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="mt-5 max-h-[360px] overflow-y-auto">
            {!debouncedQuery.trim() ? (
              <p className="px-2 py-10 text-center text-sm text-slate-500">
                Search by user name to start a conversation.
              </p>
            ) : null}

            {isLoading ? (
              <p className="px-2 py-10 text-center text-sm text-slate-400">
                Searching users...
              </p>
            ) : null}

            {error ? (
              <p className="px-2 py-10 text-center text-sm text-rose-300">
                {error}
              </p>
            ) : null}

            {!isLoading &&
            !error &&
            debouncedQuery.trim() &&
            results.length === 0 ? (
              <p className="px-2 py-10 text-center text-sm text-slate-500">
                No users found.
              </p>
            ) : null}

            {!isLoading && !error
              ? results.map((user) => {
                  const initials = user.name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part.charAt(0).toUpperCase())
                    .join("");

                  const isPending = pendingUserId === user.id;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      disabled={Boolean(pendingUserId)}
                      onClick={() => handleStartConversation(user)}
                      className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2a2247]">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-[#8b5cf6]">{initials}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-white">
                          {user.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {isPending ? "Starting chat..." : "Message"}
                        </p>
                      </div>
                    </button>
                  );
                })
              : null}
          </div>
        </div>
        {showCreateGroup && (
          <Suspense fallback={null}>
            <CreateGroupModal onClose={() => setShowCreateGroup(false)} />
          </Suspense>
        )}

   

      </div>
    </div>
  );
}
