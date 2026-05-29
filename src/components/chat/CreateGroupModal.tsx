import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../../store/auth.store";
import { useNavigate } from "react-router-dom";
import { X, Search, Users, Check } from "../ui/icons";
import { userService } from "../../services/user.service";
import { conversationService } from "../../services/conversation.service";
import { useConversationActions } from "../../store/conversation.selectors";
import { useDebounce } from "../../hooks/useDebounce";
import { ApiError } from "../../lib/api";
import type { UserSearchResultDto } from "../../types";

interface CreateGroupModalProps {
  onClose: () => void;
}

export function CreateGroupModal({ onClose }: CreateGroupModalProps) {
  const currentUserId = useAuthStore((s) => s.user?.id ?? "");
  const navigate = useNavigate();
  const { upsertConversation } = useConversationActions();

  const [groupName, setGroupName] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResultDto[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResultDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      return;
    }

    const controller = new AbortController();

    userService
      .searchUser(trimmed, controller.signal)
      .then((res) => {
        const filtered = res.data.users.filter((u) => u.id !== currentUserId);
        setSearchResults(filtered);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSearchResults([]);
        setSearchError(
          err instanceof ApiError ? err.message : "Failed to search users",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsSearching(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, currentUserId]);

  const toggleUser = useCallback((user: UserSearchResultDto) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      return isSelected
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user];
    });
  }, []);

  const isSelected = (userId: string) =>
    selectedUsers.some((u) => u.id === userId);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("");

  const handleCreate = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setCreateError("Please enter a group name.");
      return;
    }
    if (selectedUsers.length < 2) {
      setCreateError("Please select at least 2 members.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await conversationService.createGroup({
        name: trimmedName,
        participantIds: selectedUsers.map((u) => u.id),
      });
      upsertConversation(response.data);
      navigate(`/chat/${response.data.id}`);
      onClose();
    } catch (err: unknown) {
      setCreateError(
        err instanceof ApiError ? err.message : "Failed to create group",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        className="flex w-full max-w-[560px] flex-col rounded-3xl border border-[#273244] bg-[#151b2b] text-white shadow-2xl"
      >
        <header className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8b5cf6]/20">
              <Users className="h-5 w-5 text-[#8b5cf6]" />
            </div>
            <h2 className="text-xl font-semibold">Create Group</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-col gap-5 px-6 pb-6">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">
                Group Name
              </label>
              <span className="text-xs text-slate-500">
                {groupName.length}/50
              </span>
            </div>
            <input
              type="text"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                setCreateError(null);
              }}
              placeholder="e.g. Team Alpha"
              maxLength={50}
              className="w-full rounded-2xl border border-[#273244] bg-[#101620] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]"
            />
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user)}
                  className="flex items-center gap-1.5 rounded-full border border-[#8b5cf6]/40 bg-[#8b5cf6]/10 py-1 pl-2.5 pr-2 text-sm text-[#c4b5fd] transition-colors hover:bg-[#8b5cf6]/20"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-4 w-4 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-[#8b5cf6]">
                      {getInitials(user.name)}
                    </span>
                  )}
                  <span className="font-medium">{user.name.split(" ")[0]}</span>
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Add Members{" "}
              <span className="font-normal text-slate-500">(min 2)</span>
            </label>
            <div className="flex h-11 items-center gap-3 rounded-2xl border border-[#273244] bg-[#101620] px-4 focus-within:border-[#8b5cf6] focus-within:ring-1 focus-within:ring-[#8b5cf6]">
              <Search className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuery(val);
                  setCreateError(null);
                  if (!val.trim()) {
                    setSearchResults([]);
                    setSearchError(null);
                    setIsSearching(false);
                  } else {
                    setIsSearching(true);
                    setSearchError(null);
                  }
                }}
                placeholder="Search users by name..."
                className="h-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="mt-2 max-h-[220px] overflow-y-auto rounded-2xl">
              {isSearching && (
                <p className="py-6 text-center text-sm text-slate-400">
                  Searching...
                </p>
              )}
              {searchError && (
                <p className="py-6 text-center text-sm text-rose-400">
                  {searchError}
                </p>
              )}
              {!isSearching &&
                !searchError &&
                debouncedQuery.trim() &&
                searchResults.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-500">
                    No users found.
                  </p>
                )}
              {!isSearching &&
                !searchError &&
                searchResults.map((user) => {
                  const selected = isSelected(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
                    >
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2a2247]">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-[#8b5cf6]">
                            {getInitials(user.name)}
                          </span>
                        )}
                      </div>

                      <span className="flex-1 truncate text-left text-sm font-medium text-white">
                        {user.name}
                      </span>

                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          selected
                            ? "border-[#8b5cf6] bg-[#8b5cf6]"
                            : "border-[#273244] bg-transparent"
                        }`}
                      >
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {createError && (
            <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-400">
              {createError}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={isCreating}
            className="w-full rounded-2xl bg-[#8b5cf6] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating
              ? "Creating..."
              : `Create Group${selectedUsers.length >= 2 ? ` (${selectedUsers.length} members)` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
