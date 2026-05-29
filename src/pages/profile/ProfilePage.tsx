import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, Camera, Loader2, Trash2, LogOut, BadgeCheck } from "../../components/ui/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { userService } from "../../services/user.service";
import { uploadService } from "../../services/upload.service";
import { AvatarViewer } from "../../components/ui/AvatarViewer";

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar ?? "");

  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch full profile on mount.
  // App.tsx blocks rendering until initAuth() finishes, so the token
  // is always ready by the time this useEffect runs.
  useEffect(() => {
    let cancelled = false;
    userService.getMe().then((res) => {
      if (cancelled) return;
      setName(res.data.name ?? "");
      setBio(res.data.bio ?? "");
      setAvatarUrl(res.data.avatar ?? "");
      setUsername(res.data.username ?? "");
    }).catch((err) => {
      if (cancelled) return;
      // If the user account no longer exists (DB was cleared, account deleted),
      // force logout to clear the stale localStorage session.
      if (err?.message === "User not found" || err?.status === 404) {
        logout();
        return;
      }
      console.error("[ProfilePage] getMe() failed:", err);
    });
    return () => { cancelled = true; };
  }, [logout]);

  // Sync name/avatar from auth store as a fallback if getMe hasn't loaded yet
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.name && !name) setName(user.name);
    if (user?.avatar && !avatarUrl) setAvatarUrl(user.avatar);
    if (user?.username && !username) setUsername(user.username ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  const handleSaveName = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === user?.name) return;
    setIsSavingName(true);
    setError(null);
    try {
      await userService.updateMe({ name: trimmed });
      setUser(user ? { ...user, name: trimmed } : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setIsSavingName(false);
    }
  }, [name, user, setUser]);

  const handleSaveUsername = useCallback(async () => {
    const trimmed = username.trim().toLowerCase();
    if (trimmed === (user?.username ?? "")) return;
    setIsSavingUsername(true);
    setUsernameError(null);
    try {
      await userService.updateMe({ username: trimmed });
      setUser(user ? { ...user, username: trimmed || null } : null);
    } catch (err: unknown) {
      setUsernameError(
        err instanceof Error ? err.message : "Failed to update username",
      );
    } finally {
      setIsSavingUsername(false);
    }
  }, [username, user, setUser]);

  const handleSaveBio = useCallback(async () => {
    setIsSavingBio(true);
    setError(null);
    try {
      await userService.updateMe({ bio: bio.trim() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update bio");
    } finally {
      setIsSavingBio(false);
    }
  }, [bio]);

  const handleAvatarUpload = useCallback(
    async (file: File) => {
      setIsUploadingAvatar(true);
      setError(null);
      try {
        const uploadRes = await uploadService.uploadFile(file);
        const { url, publicId } = uploadRes.data;
        await userService.updateMe({ avatar: url, avatarPublicId: publicId });
        setAvatarUrl(url);
        setUser(user ? { ...user, avatar: url } : null);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to upload avatar",
        );
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [user, setUser],
  );

  const handleRemoveAvatar = useCallback(async () => {
    setIsUploadingAvatar(true);
    setError(null);
    try {
      await userService.deleteAvatar();
      setAvatarUrl("");
      setUser(user ? { ...user, avatar: "" } : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [user, setUser]);

  const handleDeleteAccount = useCallback(async () => {
    setIsDeletingAccount(true);
    try {
      await userService.deleteAccount();
      await logout();
      navigate("/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setIsDeletingAccount(false);
    }
  }, [logout, navigate]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login");
  }, [logout, navigate]);

  const initials = (user?.name ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  return (
    <div
      className="flex flex-col bg-[#0b0f19] text-white"
      style={{
        height: "100dvh",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <AvatarViewer src={viewerSrc} alt={user?.name} onClose={() => setViewerSrc(null)} />
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
        <div className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8">
          {error ? (
            <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.name}
                  onClick={() => setViewerSrc(avatarUrl)}
                  className="h-28 w-28 cursor-zoom-in rounded-full border-2 border-[#273244] object-cover sm:h-36 sm:w-36"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#2a2247] text-3xl font-bold text-[#c4b5fd] sm:h-36 sm:w-36 sm:text-4xl">
                  {initials}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#8b5cf6] text-white shadow-lg transition hover:bg-[#7c3aed] disabled:opacity-50"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>

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

            {avatarUrl ? (
              <button
                type="button"
                onClick={() => void handleRemoveAvatar()}
                disabled={isUploadingAvatar}
                className="text-xs text-rose-400 transition hover:text-rose-300"
              >
                Remove Photo
              </button>
            ) : null}
          </div>

          <div className="mt-8">
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void handleSaveName()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSaveName();
              }}
              maxLength={50}
              className="w-full rounded-xl bg-[#1d2635] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-[#8b5cf6]"
              placeholder="Your name"
            />
            {isSavingName ? (
              <p className="mt-1 text-xs text-slate-500">Saving...</p>
            ) : null}
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => void handleSaveUsername()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSaveUsername();
              }}
              maxLength={30}
              className="w-full rounded-xl bg-[#1d2635] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-[#8b5cf6]"
              placeholder="yourname (letters, numbers, underscores)"
            />
            {isSavingUsername ? (
              <p className="mt-1 text-xs text-slate-500">Saving...</p>
            ) : null}
            {usernameError ? (
              <p className="mt-1 text-xs text-rose-400">{usernameError}</p>
            ) : null}
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              onBlur={() => void handleSaveBio()}
              maxLength={200}
              rows={3}
              className="w-full resize-none rounded-xl bg-[#1d2635] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-[#8b5cf6]"
              placeholder="Write something about yourself..."
            />
            <p className="mt-1 text-right text-xs text-slate-500">
              {bio.length}/200
            </p>
            {isSavingBio ? (
              <p className="mt-1 text-xs text-slate-500">Saving...</p>
            ) : null}
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Email
            </label>
            <div className="flex items-center gap-3 rounded-xl bg-[#1d2635] px-4 py-3">
              <p className="flex-1 truncate text-sm text-slate-300">
                {user?.email}
              </p>
              {user?.isEmailVerified && (
                <BadgeCheck className="h-5 w-5 text-[#8b5cf6]" />
              )}
            </div>
          </div>

          <hr className="my-8 border-[#273244]" />

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-3 rounded-xl bg-[#1d2635] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5"
            >
              <LogOut className="h-5 w-5" />
              Log Out
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex w-full items-center gap-3 rounded-xl bg-[#1d2635] px-4 py-3 text-sm text-rose-400 transition hover:bg-rose-950/30"
            >
              <Trash2 className="h-5 w-5" />
              Delete Account
            </button>
          </div>

          {showDeleteConfirm ? (
            <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-950/20 p-4">
              <p className="text-sm text-rose-200">
                Are you sure? This action is permanent and cannot be undone.
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleDeleteAccount()}
                  disabled={isDeletingAccount}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {isDeletingAccount ? "Deleting..." : "Yes, Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
