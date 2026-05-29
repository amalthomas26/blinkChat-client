import { useState, useRef, useCallback, useEffect } from "react";
import {
  ArrowLeft,
  Camera,
  Loader2,
  MoreVertical,
  Search,
  UserPlus,
  LogOut,
  Shield,
  ShieldOff,
  UserX,
  X,
  Pencil,
  Check,
} from "../../components/ui/icons";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { useConversation } from "../../store/conversation.selectors";
import { useConversationStore } from "../../store/conversation.store";
import { conversationService } from "../../services/conversation.service";
import { uploadService } from "../../services/upload.service";
import { userService } from "../../services/user.service";
import { AvatarViewer } from "../../components/ui/AvatarViewer";
import type { UserSearchResultDto, ConversationListUserDto } from "../../types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

// ─── Member action dropdown (portal-based to escape any overflow) ──────────
interface MemberActionMenuProps {
  member: ConversationListUserDto;
  isAdminMember: boolean;
  anchorRect: DOMRect;
  onPromote: () => void;
  onDemote: () => void;
  onRemove: () => void;
  onClose: () => void;
}

function MemberActionMenu({
  isAdminMember,
  anchorRect,
  onPromote,
  onDemote,
  onRemove,
  onClose,
}: MemberActionMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [onClose]);

  // Position: right-align to the anchor, appear below (or above if near bottom)
  const menuWidth = 188;
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const above = spaceBelow < 130; // flip if less than 130px below

  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    width: menuWidth,
    right: window.innerWidth - anchorRect.right,
    ...(above
      ? { bottom: window.innerHeight - anchorRect.top + 4 }
      : { top: anchorRect.bottom + 4 }),
  };

  return createPortal(
    <div
      ref={ref}
      style={style}
      className="overflow-hidden rounded-xl border border-[#273244] bg-[#101620] py-1 shadow-2xl"
    >
      {!isAdminMember ? (
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => { onPromote(); onClose(); }}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5"
        >
          <Shield className="h-4 w-4 text-indigo-400" />
          Make Admin
        </button>
      ) : (
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => { onDemote(); onClose(); }}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5"
        >
          <ShieldOff className="h-4 w-4 text-slate-400" />
          Remove Admin
        </button>
      )}
      <div className="my-1 border-t border-[#273244]" />
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => { onRemove(); onClose(); }}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 transition hover:bg-rose-950/30"
      >
        <UserX className="h-4 w-4" />
        Remove from group
      </button>
    </div>,
    document.body,
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export function GroupInfoPage() {
  const navigate = useNavigate();
  const { id: conversationId } = useParams<{ id: string }>();
  const conversation = useConversation(conversationId ?? "");

  const currentUserId = useAuthStore((s) => s.user?.id);
  const upsertConversation = useConversationStore((s) => s.upsertConversation);
  const updateGroupName = useConversationStore((s) => s.updateGroupName);
  const updateGroupAvatar = useConversationStore((s) => s.updateGroupAvatar);
  const updateParticipants = useConversationStore((s) => s.updateParticipants);
  const removeConversation = useConversationStore((s) => s.removeConversation);

  // Fresh fetch on mount to guarantee role fields are populated
  const [isFetching, setIsFetching] = useState(false);
  useEffect(() => {
    if (!conversationId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFetching(true);
    conversationService
      .getConversation(conversationId)
      .then((res) => upsertConversation(res.data))
      .catch(() => {})
      .finally(() => setIsFetching(false));
  }, [conversationId, upsertConversation]);

  const currentParticipant = conversation?.participants.find(
    (p) => p.id === currentUserId,
  );
  const isAdmin = currentParticipant?.role === "admin";

  // ── Group name ────────────────────────────────────────────────────────────
  const [groupName, setGroupName] = useState(conversation?.name ?? "");
  const [isSavingName, setIsSavingName] = useState(false);

  // ── Description ───────────────────────────────────────────────────────────
  const [descValue, setDescValue] = useState(conversation?.groupDescription ?? "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isSavingDesc, setIsSavingDesc] = useState(false);

  // ── Avatar ────────────────────────────────────────────────────────────────
  const [avatarUrl, setAvatarUrl] = useState(conversation?.groupAvatar ?? "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Member actions ────────────────────────────────────────────────────────
  const [openMenuForId, setOpenMenuForId] = useState<string | null>(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Add member search ─────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResultDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // ── Leave ─────────────────────────────────────────────────────────────────
  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // ── Error ─────────────────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);

  // Sync local fields when store updates
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (conversation?.name) setGroupName(conversation.name);
    setAvatarUrl(conversation?.groupAvatar ?? "");
    if (!isEditingDesc) setDescValue(conversation?.groupDescription ?? "");
  }, [conversation, isEditingDesc]);

  // Redirect if not a group
  useEffect(() => {
    if (conversation && conversation.type !== "group") {
      navigate(`/chat/${conversationId}`);
    }
  }, [conversation, conversationId, navigate]);

  // Debounced member search
  useEffect(() => {
    searchAbortRef.current?.abort();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      // Defer the state update so it doesn't cause a synchronous cascading render
      const raf = requestAnimationFrame(() => { setSearchResults([]); setIsSearching(false); });
      return () => cancelAnimationFrame(raf);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSearching(true);
    const ctrl = new AbortController();
    searchAbortRef.current = ctrl;
    const timer = setTimeout(async () => {
      try {
        const res = await userService.searchUser(trimmed, ctrl.signal);
        const existingIds = new Set(conversation?.participants.map((p) => p.id) ?? []);
        setSearchResults(res.data.users.filter((u) => !existingIds.has(u.id)));
      } catch { /* aborted */ } finally { setIsSearching(false); }
    }, 300);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [searchQuery, conversation?.participants]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveName = useCallback(async () => {
    const trimmed = groupName.trim();
    if (!trimmed || trimmed === conversation?.name) return;
    setIsSavingName(true);
    setError(null);
    try {
      await conversationService.renameGroup(conversationId!, trimmed);
      updateGroupName(conversationId!, trimmed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to rename group");
    } finally { setIsSavingName(false); }
  }, [groupName, conversation?.name, conversationId, updateGroupName]);

  const handleSaveDescription = useCallback(async () => {
    setIsSavingDesc(true);
    setError(null);
    try {
      // The backend reuses PATCH /conversations/:id/name — check if a dedicated
      // description endpoint exists; otherwise use a generic update.
      // We'll use the conversation service's renameGroup-style approach.
      await conversationService.updateDescription(conversationId!, descValue.trim());
      // Optimistically update the store by upsertConversation with new description
      if (conversation) {
        upsertConversation({ ...conversation, groupDescription: descValue.trim() });
      }
      setIsEditingDesc(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update description");
    } finally { setIsSavingDesc(false); }
  }, [descValue, conversationId, conversation, upsertConversation]);

  const handleAvatarUpload = useCallback(async (file: File) => {
    setIsUploadingAvatar(true);
    setError(null);
    try {
      const uploadRes = await uploadService.uploadFile(file);
      const { url, publicId } = uploadRes.data;
      await conversationService.updateGroupAvatar(conversationId!, url, publicId);
      setAvatarUrl(url);
      updateGroupAvatar(conversationId!, url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally { setIsUploadingAvatar(false); }
  }, [conversationId, updateGroupAvatar]);

  const handleRemoveAvatar = useCallback(async () => {
    setIsUploadingAvatar(true);
    setError(null);
    try {
      await conversationService.deleteGroupAvatar(conversationId!);
      setAvatarUrl("");
      updateGroupAvatar(conversationId!, null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove photo");
    } finally { setIsUploadingAvatar(false); }
  }, [conversationId, updateGroupAvatar]);

  const handlePromote = async (userId: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      await conversationService.promoteAdmin(conversationId!, userId);
      updateParticipants(
        conversationId!,
        (conversation?.participants ?? []).map((p) =>
          p.id === userId ? { ...p, role: "admin" as const } : p,
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to promote member");
    } finally { setActionLoading(null); }
  };

  const handleDemote = async (userId: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      await conversationService.demoteAdmin(conversationId!, userId);
      updateParticipants(
        conversationId!,
        (conversation?.participants ?? []).map((p) =>
          p.id === userId ? { ...p, role: "member" as const } : p,
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to demote member");
    } finally { setActionLoading(null); }
  };

  const handleRemoveMember = async (userId: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      await conversationService.removeMembers(conversationId!, [userId]);
      updateParticipants(
        conversationId!,
        (conversation?.participants ?? []).filter((p) => p.id !== userId),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally { setActionLoading(null); }
  };

  const handleAddMember = async (user: UserSearchResultDto) => {
    setAddingUserId(user.id);
    setError(null);
    try {
      const res = await conversationService.addMembers(conversationId!, [user.id]);
      const newMembers: ConversationListUserDto[] = res.data.added;
      updateParticipants(conversationId!, [
        ...(conversation?.participants ?? []),
        ...newMembers,
      ]);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally { setAddingUserId(null); }
  };

  const handleLeave = useCallback(async () => {
    setIsLeaving(true);
    setError(null);
    try {
      await conversationService.leaveGroup(conversationId!);
      removeConversation(conversationId!);
      navigate("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to leave group");
      setIsLeaving(false);
    }
  }, [conversationId, removeConversation, navigate]);

  const groupInitials = getInitials(conversation?.name ?? "G");

  if (!conversation || isFetching) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0f19]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-[#0b0f19] text-white"
      style={{
        height: "100dvh",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* Fullscreen avatar viewer */}
      <AvatarViewer
        src={viewerSrc}
        alt={conversation.name ?? "Group"}
        onClose={() => setViewerSrc(null)}
      />

    
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#273244] bg-[#101620] px-3 sm:h-16 sm:px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold sm:text-lg">Group Info</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8">

         
          {error ? (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-400/30 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="ml-3 shrink-0 text-rose-400 hover:text-rose-300">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

       
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
          
              <button
                type="button"
                onClick={() => avatarUrl && setViewerSrc(avatarUrl)}
                className={avatarUrl ? "cursor-zoom-in" : "cursor-default"}
                tabIndex={avatarUrl ? 0 : -1}
                aria-label="View full photo"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={conversation.name ?? "Group"}
                    className="h-28 w-28 rounded-full border-2 border-[#273244] object-cover sm:h-36 sm:w-36"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#2a2247] text-3xl font-bold text-[#c4b5fd] sm:h-36 sm:w-36 sm:text-4xl">
                    {groupInitials}
                  </div>
                )}
              </button>

             
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#8b5cf6] text-white shadow-lg transition hover:bg-[#7c3aed] disabled:opacity-50 sm:bottom-2 sm:right-2"
                >
                  {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
              )}

   
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAvatarUpload(file);
                  e.currentTarget.value = "";
                }}
              />
            </div>

            {isAdmin && avatarUrl ? (
              <button
                type="button"
                onClick={() => void handleRemoveAvatar()}
                disabled={isUploadingAvatar}
                className="text-xs text-rose-400 transition hover:text-rose-300 disabled:opacity-50"
              >
                Remove Photo
              </button>
            ) : null}
          </div>

        
          <div className="mt-8">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Group Name
            </label>
            {isAdmin ? (
              <>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onBlur={() => void handleSaveName()}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleSaveName(); }}
                  maxLength={80}
                  className="w-full rounded-xl bg-[#1d2635] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-[#8b5cf6]"
                  placeholder="Group name"
                />
                {isSavingName ? <p className="mt-1 text-xs text-slate-500">Saving…</p> : null}
              </>
            ) : (
              <div className="rounded-xl bg-[#1d2635] px-4 py-3 text-sm text-slate-300">
                {conversation.name ?? "—"}
              </div>
            )}
          </div>

      
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Description
              </label>
              {isAdmin && !isEditingDesc && (
                <button
                  type="button"
                  onClick={() => setIsEditingDesc(true)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              )}
            </div>

            {isAdmin && isEditingDesc ? (
              <>
                <textarea
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  rows={3}
                  maxLength={300}
                  autoFocus
                  className="w-full resize-none rounded-xl bg-[#1d2635] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-[#8b5cf6]"
                  placeholder="Describe the group…"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{descValue.length}/300</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setIsEditingDesc(false); setDescValue(conversation.groupDescription ?? ""); }}
                      className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveDescription()}
                      disabled={isSavingDesc}
                      className="flex items-center gap-1.5 rounded-lg bg-[#8b5cf6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7c3aed] disabled:opacity-50"
                    >
                      {isSavingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Save
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="min-h-[44px] rounded-xl bg-[#1d2635] px-4 py-3 text-sm text-slate-300">
                {conversation.groupDescription?.trim()
                  ? conversation.groupDescription
                  : <span className="italic text-slate-500">No description yet.</span>}
              </div>
            )}
          </div>

          {/* ── Members list ───────────────────────────────────────────── */}
          <div className="mt-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
              Members · {conversation.participants.length}
              {conversation.maxParticipants && conversation.maxParticipants > conversation.participants.length ? (
                <span className="ml-1 text-slate-500">of {conversation.maxParticipants}</span>
              ) : null}
            </p>

            {/* Scrollable list — overflow-visible on wrapper so dropdowns escape */}
            <div className="max-h-[360px] overflow-y-auto overflow-x-visible rounded-xl bg-[#1d2635]">
              {conversation.participants.map((member, idx) => {
                const isSelf = member.id === currentUserId;
                const memberInitials = getInitials(member.name || "U");
                const isLoadingAction = actionLoading === member.id;
                const memberIsAdmin = member.role === "admin";

                return (
                  <div
                    key={member.id}
                    className={`relative flex items-center gap-3 px-4 py-3 transition ${
                      idx > 0 ? "border-t border-white/5" : ""
                    }`}
                  >
                    {/* Clickable avatar → profile */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isSelf) navigate(`/user/${member.id}`);
                      }}
                      className={`relative shrink-0 ${!isSelf ? "cursor-pointer" : "cursor-default"}`}
                      tabIndex={isSelf ? -1 : 0}
                      aria-label={isSelf ? undefined : `View ${member.name}'s profile`}
                    >
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="h-10 w-10 rounded-full border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2a2247] text-sm font-semibold text-[#c4b5fd]">
                          {memberInitials}
                        </div>
                      )}
                      {member.status === "online" && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1d2635] bg-[#10b981]" />
                      )}
                    </button>

                    {/* Name + admin badge — clicking name also goes to profile */}
                    <button
                      type="button"
                      onClick={() => { if (!isSelf) navigate(`/user/${member.id}`); }}
                      className={`min-w-0 flex-1 text-left ${!isSelf ? "cursor-pointer hover:underline" : "cursor-default"}`}
                      tabIndex={isSelf ? -1 : 0}
                    >
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">
                          {member.name}
                          {isSelf && (
                            <span className="ml-1.5 text-xs font-normal text-slate-500">(you)</span>
                          )}
                        </p>
                        {memberIsAdmin && (
                          <span className="shrink-0 rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                            Admin
                          </span>
                        )}
                      </div>
                    </button>

                    {/* ⋮ actions — admin viewer, non-self only */}
                    {isAdmin && !isSelf && (
                      <div className="relative shrink-0">
                        {isLoadingAction ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                              if (openMenuForId === member.id) {
                                setOpenMenuForId(null);
                                setMenuAnchorRect(null);
                              } else {
                                setOpenMenuForId(member.id);
                                setMenuAnchorRect(rect);
                              }
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        )}

                        {openMenuForId === member.id && menuAnchorRect && (
                          <MemberActionMenu
                            member={member}
                            isAdminMember={memberIsAdmin}
                            anchorRect={menuAnchorRect}
                            onPromote={() => void handlePromote(member.id)}
                            onDemote={() => void handleDemote(member.id)}
                            onRemove={() => void handleRemoveMember(member.id)}
                            onClose={() => { setOpenMenuForId(null); setMenuAnchorRect(null); }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Add Member (admin only) ────────────────────────────────── */}
          {isAdmin && (
            <div className="mt-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                Add Member
              </p>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name…"
                  className="w-full rounded-xl bg-[#1d2635] py-3 pl-9 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-[#8b5cf6]"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-xl border border-[#273244] bg-[#101620]">
                  {searchResults.map((user) => {
                    const userInitials = getInitials(user.name || "U");
                    const isAdding = addingUserId === user.id;
                    return (
                      <div key={user.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5">
                        <div className="relative shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="h-9 w-9 rounded-full border border-white/10 object-cover" />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a2247] text-xs font-semibold text-[#c4b5fd]">
                              {userInitials}
                            </div>
                          )}
                          {user.status === "online" && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#101620] bg-[#10b981]" />
                          )}
                        </div>
                        <p className="min-w-0 flex-1 truncate text-sm text-white">{user.name}</p>
                        <button
                          type="button"
                          onClick={() => void handleAddMember(user)}
                          disabled={isAdding}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8b5cf6] text-white transition hover:bg-[#7c3aed] disabled:opacity-50"
                        >
                          {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
                <p className="mt-3 text-center text-sm text-slate-500">No users found</p>
              )}
            </div>
          )}

          <hr className="my-8 border-[#273244]" />

          {/* ── Leave Group ────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={() => setShowLeaveConfirm(true)}
            className="flex w-full items-center gap-3 rounded-xl bg-[#1d2635] px-4 py-3 text-sm text-rose-400 transition hover:bg-rose-950/30"
          >
            <LogOut className="h-5 w-5" />
            Leave Group
          </button>

          {showLeaveConfirm && (
            <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-950/20 p-4">
              <p className="text-sm text-rose-200">Are you sure you want to leave this group?</p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleLeave()}
                  disabled={isLeaving}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {isLeaving ? "Leaving…" : "Yes, Leave"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
