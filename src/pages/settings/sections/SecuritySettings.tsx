import { useState, useCallback } from "react";
import {
  Shield,
  Eye,
  EyeOff,
  Loader2,
  Smartphone,
  Monitor,
  LogOut,
  ChevronDown,
  ChevronUp,
} from "../../../components/ui/icons";
import { SettingsSection } from "../../../components/ui/SettingsSection";
import { SettingsToggle } from "../../../components/ui/SettingsToggle";
import { userService } from "../../../services/user.service";
import { authService } from "../../../services/auth.service";
import { useAuthStore } from "../../../store/auth.store";
import type { SessionDto } from "../../../types/auth.types";

interface SecuritySettingsProps {
  twoFactorEnabled: boolean;
  onTwoFactorChange: (enabled: boolean) => void;
  isGoogleUser: boolean;
}

export function SecuritySettings({
  twoFactorEnabled,
  onTwoFactorChange,
  isGoogleUser,
}: SecuritySettingsProps) {
  return (
    <SettingsSection title="Security" icon={Shield}>
      <TwoFactorToggle
        enabled={twoFactorEnabled}
        onChange={onTwoFactorChange}
        isGoogleUser={isGoogleUser}
      />
      <ChangePasswordForm isGoogleUser={isGoogleUser} />
      <ActiveSessions />
    </SettingsSection>
  );
}



function TwoFactorToggle({
  enabled,
  onChange,
  isGoogleUser,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  isGoogleUser: boolean;
}) {
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // The desired new state when user clicks the toggle
  const [pendingState, setPendingState] = useState(false);

  const handleToggleClick = (newValue: boolean) => {
    setPendingState(newValue);
    setPassword("");
    setError(null);
    setShowPasswordPrompt(true);
  };

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await userService.toggle2FA(pendingState, password);
      onChange(pendingState);
      setShowPasswordPrompt(false);
      setPassword("");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to update 2FA setting",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Google users can't use 2FA (no password)
  if (isGoogleUser) {
    return (
      <div className="py-3">
        <p className="text-sm text-slate-400">
          Two-factor authentication is not available for Google login accounts.
        </p>
      </div>
    );
  }

  return (
    <div>
      <SettingsToggle
        label="Two-factor authentication"
        description="Require an email verification code on every login"
        checked={enabled}
        onChange={handleToggleClick}
      />

      {/* Password confirmation modal (inline) */}
      {showPasswordPrompt && (
        <div className="mt-2 mb-3 rounded-lg bg-[#1e293b]/80 p-4 border border-slate-700/50">
          <p className="text-sm text-slate-300 mb-3">
            Enter your password to {pendingState ? "enable" : "disable"} 2FA:
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2 rounded-md mb-3">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="flex-1 rounded-lg bg-[#0a0f1a] border border-slate-700 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-[#8b5cf6] focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
              autoFocus
            />
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="rounded-lg bg-[#8b5cf6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7c3aed] disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm"
              )}
            </button>
            <button
              onClick={() => setShowPasswordPrompt(false)}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



function ChangePasswordForm({ isGoogleUser }: { isGoogleUser: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const logout = useAuthStore((s) => s.logout);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // Client-side validation
    if (!currentPassword) {
      setError("Current password is required");
      return;
    }
    if (!newPassword) {
      setError("New password is required");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      return;
    }

    setIsLoading(true);

    try {
      await authService.changePassword(currentPassword, newPassword);
      setSuccess("Password changed! You'll be logged out in a moment...");
      resetForm();

      // Server revoked all sessions. Give user time to read the message,
      // then force logout on this client.
      setTimeout(() => {
        logout();
      }, 2500);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to change password",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isGoogleUser) return null;

  return (
    <div className="py-3">
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (!isExpanded) resetForm();
        }}
        className="flex w-full items-center justify-between text-sm font-medium text-slate-200 hover:text-white transition-colors"
      >
        <span>Change password</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2 rounded-md">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-2 rounded-md">
              {success}
            </div>
          )}

         
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full rounded-lg bg-[#0a0f1a] border border-slate-700 px-3 py-2.5 pr-10 text-sm text-slate-200 placeholder:text-slate-500 focus:border-[#8b5cf6] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

        
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded-lg bg-[#0a0f1a] border border-slate-700 px-3 py-2.5 pr-10 text-sm text-slate-200 placeholder:text-slate-500 focus:border-[#8b5cf6] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

    
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-lg bg-[#0a0f1a] border border-slate-700 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-[#8b5cf6] focus:outline-none"
          />

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full rounded-lg bg-[#8b5cf6] py-2.5 text-sm font-medium text-white hover:bg-[#7c3aed] disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Changing..." : "Change password"}
          </button>
        </div>
      )}
    </div>
  );
}



function parseDeviceName(ua: string): { name: string; isMobile: boolean } {
  const lower = ua.toLowerCase();

  const isMobile =
    /mobile|android|iphone|ipad|ipod/.test(lower);

  let name = "Unknown Device";

  if (/chrome/i.test(ua) && !/edg/i.test(ua)) {
    name = "Chrome";
  } else if (/firefox/i.test(ua)) {
    name = "Firefox";
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    name = "Safari";
  } else if (/edg/i.test(ua)) {
    name = "Edge";
  }

  if (/windows/i.test(ua)) name += " on Windows";
  else if (/macintosh|mac os/i.test(ua)) name += " on macOS";
  else if (/linux/i.test(ua)) name += " on Linux";
  else if (/android/i.test(ua)) name += " on Android";
  else if (/iphone|ipad/i.test(ua)) name += " on iOS";

  return { name, isMobile };
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function ActiveSessions() {
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.getSessions();
      setSessions(res.data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load sessions",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleToggleExpand = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (next) {
      void fetchSessions();
    }
  };

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      await authService.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to revoke session",
      );
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    setRevoking("all");
    try {
      await authService.revokeAllOtherSessions();
      // Keep only the current session
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to revoke sessions");
    } finally {
      setRevoking(null);
    }
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="py-3">
      <button
        onClick={handleToggleExpand}
        className="flex w-full items-center justify-between text-sm font-medium text-slate-200 hover:text-white transition-colors"
      >
        <span>Active sessions</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2 rounded-md">
              {error}
            </div>
          )}

          {!isLoading &&
            sessions.map((session) => {
              const { name, isMobile } = parseDeviceName(session.userAgent);
              const DeviceIcon = isMobile ? Smartphone : Monitor;

              return (
                <div
                  key={session.sessionId}
                  className="flex items-center gap-3 rounded-lg bg-[#0a0f1a]/60 p-3 border border-slate-800/40"
                >
                  <DeviceIcon className="h-5 w-5 shrink-0 text-slate-400" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">
                      {name}
                      {session.isCurrent && (
                        <span className="ml-2 text-xs text-[#8b5cf6] font-medium">
                          (This device)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {session.ip} · {formatRelativeTime(session.lastUsedAt)}
                    </p>
                  </div>

                  {!session.isCurrent && (
                    <button
                      onClick={() => handleRevoke(session.sessionId)}
                      disabled={revoking === session.sessionId}
                      className="shrink-0 rounded-md bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                    >
                      {revoking === session.sessionId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Sign out"
                      )}
                    </button>
                  )}
                </div>
              );
            })}

          
          {!isLoading && otherSessions.length > 0 && (
            <button
              onClick={handleRevokeAll}
              disabled={revoking === "all"}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors mt-2"
            >
              <LogOut className="h-4 w-4" />
              {revoking === "all"
                ? "Signing out..."
                : `Sign out all other devices (${otherSessions.length})`}
            </button>
          )}

          {!isLoading && sessions.length === 0 && !error && (
            <p className="text-sm text-slate-500 text-center py-2">
              No active sessions found
            </p>
          )}
        </div>
      )}
    </div>
  );
}
