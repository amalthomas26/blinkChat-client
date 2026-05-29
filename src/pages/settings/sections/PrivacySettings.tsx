import { useState, useCallback } from "react";
import { Lock, Loader2, UserX } from "../../../components/ui/icons";
import { SettingsSection } from "../../../components/ui/SettingsSection";
import { SettingsToggle } from "../../../components/ui/SettingsToggle";
import { userService } from "../../../services/user.service";
import type { PrivacyPrefs } from "../../../types/auth.types";

interface PrivacySettingsProps {
    prefs: PrivacyPrefs;
    onPrefsChange: (prefs: PrivacyPrefs) => void;
}

export function PrivacySettings({
    prefs,
    onPrefsChange,
}: PrivacySettingsProps) {
    const [loadingField, setLoadingField] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleToggle = async (
        field: keyof PrivacyPrefs,
        newValue: boolean,
    ) => {
        const prevPrefs = { ...prefs };
        onPrefsChange({ ...prefs, [field]: newValue });

        setLoadingField(field);
        setError(null);

        try {
            const res = await userService.updatePrivacyPrefs({
                [field]: newValue,
            });
            onPrefsChange(res.data);
        } catch (err: unknown) {
            onPrefsChange(prevPrefs);
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to update privacy settings",
            );
        } finally {
            setLoadingField(null);
        }
    };

    return (
        <SettingsSection title="Privacy" icon={Lock}>
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2 rounded-md mb-2">
                    {error}
                </div>
            )}

            <SettingsToggle
                label="Show online status"
                description="Let others see when you're online"
                checked={prefs.showOnlineStatus}
                onChange={(v) => handleToggle("showOnlineStatus", v)}
                loading={loadingField === "showOnlineStatus"}
            />

            <SettingsToggle
                label="Show last seen"
                description="Let others see when you were last active"
                checked={prefs.showLastSeen}
                onChange={(v) => handleToggle("showLastSeen", v)}
                loading={loadingField === "showLastSeen"}
            />

            <BlockedUsersList />
        </SettingsSection>
    );
}



interface BlockedUserProfile {
    id: string;
    name: string;
    avatar: string;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join("");
}

function BlockedUsersList() {
    const [blockedUsers, setBlockedUsers] = useState<BlockedUserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [unblocking, setUnblocking] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const fetchBlocked = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        try {
            const res = await userService.getBlockedUsers();
            const ids = res.data;

            if (ids.length === 0) {
                setBlockedUsers([]);
                return;
            }

            // Fetch name + avatar for each blocked user in parallel
            const profiles = await Promise.allSettled(
                ids.map((id) => userService.getUserById(id)),
            );

            const resolved: BlockedUserProfile[] = profiles
                .map((result, i) => {
                    if (result.status === "fulfilled") {
                        const d = result.value.data;
                        return { id: d.id, name: d.name, avatar: d.avatar ?? "" };
                    }
                    // If profile fetch failed (e.g. user deleted), show ID as fallback
                    return { id: ids[i], name: ids[i].slice(-8), avatar: "" };
                });

            setBlockedUsers(resolved);
        } catch (err) {
            console.error("[BlockedUsersList] fetch failed:", err);
            setFetchError("Failed to load blocked users");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleToggleExpand = () => {
        const next = !isExpanded;
        setIsExpanded(next);
        if (next) {
            void fetchBlocked();
        }
    };

    const handleUnblock = async (userId: string) => {
        setUnblocking(userId);
        try {
            await userService.unblockUser(userId);
            setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (err) {
            console.error("[BlockedUsersList] unblock failed:", err);
        } finally {
            setUnblocking(null);
        }
    };

    return (
        <div className="py-3">
            <button
                onClick={handleToggleExpand}
                className="flex w-full items-center justify-between text-sm font-medium text-slate-200 hover:text-white transition-colors"
            >
                <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-slate-400" />
                    <span>Blocked users</span>
                </div>
                <span className="text-xs text-slate-500">
                    {isExpanded ? "Hide" : blockedUsers.length > 0 ? blockedUsers.length : ""}
                </span>
            </button>

            {isExpanded && (
                <div className="mt-3 space-y-2">
                    {isLoading && (
                        <div className="flex justify-center py-3">
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        </div>
                    )}

                    {!isLoading && fetchError && (
                        <p className="text-xs text-red-400 text-center py-2">{fetchError}</p>
                    )}

                    {!isLoading && !fetchError && blockedUsers.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-2">
                            No blocked users
                        </p>
                    )}

                    {!isLoading &&
                        blockedUsers.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center gap-3 rounded-lg bg-[#0a0f1a]/60 p-3 border border-slate-800/40"
                            >
                                {/* Avatar */}
                                <div className="shrink-0">
                                    {user.avatar ? (
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className="h-9 w-9 rounded-full object-cover border border-slate-700"
                                        />
                                    ) : (
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a2247] text-xs font-semibold text-[#c4b5fd]">
                                            {getInitials(user.name)}
                                        </div>
                                    )}
                                </div>

                                <p className="flex-1 min-w-0 text-sm text-slate-300 truncate font-medium">
                                    {user.name}
                                </p>

                                <button
                                    onClick={() => handleUnblock(user.id)}
                                    disabled={unblocking === user.id}
                                    className="shrink-0 rounded-md bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 disabled:opacity-50 transition-colors"
                                >
                                    {unblocking === user.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        "Unblock"
                                    )}
                                </button>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}
