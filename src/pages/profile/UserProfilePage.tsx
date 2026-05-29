import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  ShieldBan,
  ShieldCheck,
} from "../../components/ui/icons";
import { useNavigate, useParams } from "react-router-dom";
import { userService } from "../../services/user.service";
import { conversationService } from "../../services/conversation.service";
import { AvatarViewer } from "../../components/ui/AvatarViewer";

interface PublicProfile {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  status: "online" | "offline" | "away";
  lastSeen: string | null;
  createdAt: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export function UserProfilePage() {
  const navigate = useNavigate();
  const { id: userId } = useParams<{ id: string }>();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Block state
  const [isBlocked, setIsBlocked] = useState(false);
  const [isTogglingBlock, setIsTogglingBlock] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  // Message
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);

  // Fetch profile + block status in parallel
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    // Don't call setState synchronously — it causes a cascading re-render.
    // Instead start the promise chain, and only update state in callbacks.
    Promise.all([
      userService.getUserById(userId),
      userService.getBlockedUsers(),
    ])
      .then(([profileRes, blockedRes]) => {
        if (cancelled) return;
        setProfile(profileRes.data as unknown as PublicProfile);
        setIsBlocked(blockedRes.data.includes(userId));
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load profile");
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [userId]);

  const handleMessage = useCallback(async () => {
    if (!userId) return;
    setIsStartingChat(true);
    try {
      const res = await conversationService.startConversation(userId);
      navigate(`/chat/${res.data.conversationId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start chat");
      setIsStartingChat(false);
    }
  }, [userId, navigate]);

  const handleBlockToggle = useCallback(async () => {
    if (!userId) return;
    const next = !isBlocked;

    // Optimistic
    setIsBlocked(next);
    setIsTogglingBlock(true);
    setShowBlockConfirm(false);
    setError(null);

    try {
      if (next) {
        await userService.blockUser(userId);
      } else {
        await userService.unblockUser(userId);
      }
    } catch (err: unknown) {
      // Rollback
      setIsBlocked(!next);
      setError(
        err instanceof Error
          ? err.message
          : next
            ? "Failed to block user"
            : "Failed to unblock user",
      );
    } finally {
      setIsTogglingBlock(false);
    }
  }, [userId, isBlocked]);

  const initials = getInitials(profile?.name ?? "U");
  const isOnline = profile?.status === "online";

  return (
    <div
      className="flex flex-col bg-[#0b0f19] text-white"
      style={{
        height: "100dvh",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <AvatarViewer src={viewerSrc} alt={profile?.name} onClose={() => setViewerSrc(null)} />
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#273244] bg-[#101620] px-3 sm:h-16 sm:px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold sm:text-lg">Profile</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : error && !profile ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        ) : profile ? (
          <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
            {/* Inline error (non-fatal) */}
            {error ? (
              <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {/* Avatar + status */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    onClick={() => setViewerSrc(profile.avatar)}
                    className="h-28 w-28 cursor-zoom-in rounded-full border-2 border-[#273244] object-cover sm:h-36 sm:w-36"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#2a2247] text-3xl font-bold text-[#c4b5fd] sm:h-36 sm:w-36 sm:text-4xl">
                    {initials}
                  </div>
                )}

                {/* Online dot */}
                <span
                  className={`absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-[#0b0f19] sm:bottom-2.5 sm:right-2.5 sm:h-5 sm:w-5 ${
                    isOnline ? "bg-[#10b981]" : "bg-slate-600"
                  }`}
                />
              </div>

              <p className="text-xs text-slate-400">
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>

            {/* Name */}
            <div className="mt-5 text-center">
              <h2 className="text-2xl font-semibold text-white">
                {profile.name}
              </h2>
            </div>

            {/* Bio — always show the section, placeholder if empty */}
            <div className="mt-6">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Bio
              </label>
              <div className="min-h-[48px] rounded-xl bg-[#1d2635] px-4 py-3 text-sm text-slate-300">
                {profile.bio && profile.bio.trim()
                  ? profile.bio
                  : <span className="italic text-slate-500">No bio yet.</span>}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-8 space-y-3">
              {/* Message */}
              {!isBlocked && (
                <button
                  type="button"
                  onClick={() => void handleMessage()}
                  disabled={isStartingChat}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#7c3aed] disabled:opacity-50"
                >
                  {isStartingChat ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  {isStartingChat ? "Opening chat..." : "Message"}
                </button>
              )}

              {/* Block / Unblock */}
              <button
                type="button"
                onClick={() => {
                  if (isBlocked) {
                    // Unblock directly (no confirm needed)
                    void handleBlockToggle();
                  } else {
                    setShowBlockConfirm(true);
                  }
                }}
                disabled={isTogglingBlock}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition disabled:opacity-50 ${
                  isBlocked
                    ? "bg-[#1d2635] text-emerald-400 hover:bg-[#243047]"
                    : "bg-[#1d2635] text-rose-400 hover:bg-rose-950/40"
                }`}
              >
                {isTogglingBlock ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isBlocked ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <ShieldBan className="h-4 w-4" />
                )}
                {isTogglingBlock
                  ? isBlocked
                    ? "Unblocking..."
                    : "Blocking..."
                  : isBlocked
                    ? "Unblock User"
                    : "Block User"}
              </button>
            </div>

            {/* Block confirmation */}
            {showBlockConfirm && (
              <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-950/20 p-4">
                <p className="text-sm text-rose-200">
                  Block <span className="font-semibold">{profile.name}</span>?
                  They won't be able to message you.
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => void handleBlockToggle()}
                    disabled={isTogglingBlock}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
                  >
                    {isTogglingBlock ? "Blocking..." : "Yes, Block"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBlockConfirm(false)}
                    className="rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
