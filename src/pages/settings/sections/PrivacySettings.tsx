import { useState, useEffect, useCallback } from "react";
import { Lock, Loader2, UserX } from "lucide-react";
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



function BlockedUsersList() {
    const [blockedIds, setBlockedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [unblocking, setUnblocking] = useState<string | null>(null);

    const fetchBlocked = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await userService.getBlockedUsers();
            setBlockedIds(res.data);
        } catch (err) {
            console.error("[BlockedUsersList] fetch failed:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isExpanded) {
            fetchBlocked();
        }
    }, [isExpanded, fetchBlocked]);

    const handleUnblock = async (userId: string) => {
        setUnblocking(userId);
        try {
            await userService.unblockUser(userId);
            setBlockedIds((prev) => prev.filter((id) => id !== userId));
        } catch (err) {
            console.error("[BlockedUsersList] unblock failed:", err);
        } finally {
            setUnblocking(null);
        }
    };

    return (
        <div className="py-3">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center justify-between text-sm font-medium text-slate-200 hover:text-white transition-colors"
            >
                <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-slate-400" />
                    <span>Blocked users</span>
                </div>
                <span className="text-xs text-slate-500">
                    {isExpanded ? "Hide" : `${blockedIds.length > 0 ? blockedIds.length : ""}`}
                </span>
            </button>

            {isExpanded && (
                <div className="mt-3 space-y-2">
                    {isLoading && (
                        <div className="flex justify-center py-3">
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        </div>
                    )}

                    {!isLoading && blockedIds.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-2">
                            No blocked users
                        </p>
                    )}

                    {!isLoading &&
                        blockedIds.map((userId) => (
                            <div
                                key={userId}
                                className="flex items-center justify-between rounded-lg bg-[#0a0f1a]/60 p-3 border border-slate-800/40"
                            >
                                <p className="text-sm text-slate-300 truncate font-mono">
                                    {userId}
                                </p>
                                <button
                                    onClick={() => handleUnblock(userId)}
                                    disabled={unblocking === userId}
                                    className="shrink-0 rounded-md bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 disabled:opacity-50 transition-colors"
                                >
                                    {unblocking === userId ? (
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
