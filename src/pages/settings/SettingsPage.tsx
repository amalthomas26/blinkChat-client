import { useState, useEffect, useCallback } from "react";
import { ArrowLeft } from "../../components/ui/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { userService } from "../../services/user.service";
import { SecuritySettings } from "./sections/SecuritySettings";
import { NotificationSettings } from "./sections/NotificationSettings";
import { PrivacySettings } from "./sections/PrivacySettings";
import { DangerZoneSettings } from "./sections/DangerZoneSettings";
import type { NotificationPrefs, PrivacyPrefs } from "../../types/auth.types";

export function SettingsPage() {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);

    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
        browserNotifications: true,
        sounds: true,
        muteAll: false,
    });
    const [privacyPrefs, setPrivacyPrefs] = useState<PrivacyPrefs>({
        showOnlineStatus: true,
        showLastSeen: true,
    });
    const [isGoogleUser, setIsGoogleUser] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        userService
            .getMe()
            .then((res) => {
                if (cancelled) return;
                const data = res.data;
                setTwoFactorEnabled(data.twoFactorEnabled ?? false);

                const loadedNotifPrefs = data.notificationPrefs ?? {
                    browserNotifications: true,
                    sounds: true,
                    muteAll: false,
                };
                const loadedPrivacyPrefs = data.privacyPrefs ?? {
                    showOnlineStatus: true,
                    showLastSeen: true,
                };

                setNotificationPrefs(loadedNotifPrefs);
                setPrivacyPrefs(loadedPrivacyPrefs);
                setIsGoogleUser(data.provider === "google");

                // Sync prefs into auth store so the notification dispatcher
                // can read them via useAuthStore.getState().user
                if (user) {
                    setUser({
                        ...user,
                        notificationPrefs: loadedNotifPrefs,
                        privacyPrefs: loadedPrivacyPrefs,
                    });
                }
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("[SettingsPage] getMe failed:", err);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTwoFactorChange = useCallback(
        (enabled: boolean) => {
            setTwoFactorEnabled(enabled);
            if (user) setUser({ ...user, twoFactorEnabled: enabled });
        },
        [user, setUser],
    );

    // When notification prefs change (after successful PATCH), also sync to auth store
    const handleNotificationPrefsChange = useCallback(
        (prefs: NotificationPrefs) => {
            setNotificationPrefs(prefs);
            if (user) setUser({ ...user, notificationPrefs: prefs });
        },
        [user, setUser],
    );

    // When privacy prefs change (after successful PATCH), also sync to auth store
    const handlePrivacyPrefsChange = useCallback(
        (prefs: PrivacyPrefs) => {
            setPrivacyPrefs(prefs);
            if (user) setUser({ ...user, privacyPrefs: prefs });
        },
        [user, setUser],
    );

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0a0f1a]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-[#0a0f1a]">

            <header className="flex items-center gap-3 border-b border-slate-800 bg-[#0d1321] px-4 py-3.5">
                <button
                    onClick={() => navigate(-1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-[#1e293b] hover:text-slate-200 transition-colors"
                    aria-label="Go back"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-lg font-semibold text-slate-100">Settings</h1>
            </header>


            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                <div className="mx-auto flex max-w-xl flex-col gap-5">

                    <button
                        onClick={() => navigate("/profile")}
                        className="flex items-center gap-4 rounded-xl bg-[#111827]/60 border border-slate-800/50 p-4 text-left hover:bg-[#1e293b]/60 transition-colors"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] text-lg font-bold">
                            {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-100 truncate">
                                {user?.name ?? "Your Profile"}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                                {user?.email ?? "Edit your profile"}
                            </p>
                        </div>
                        <ArrowLeft className="h-4 w-4 text-slate-500 rotate-180" />
                    </button>


                    <SecuritySettings
                        twoFactorEnabled={twoFactorEnabled}
                        onTwoFactorChange={handleTwoFactorChange}
                        isGoogleUser={isGoogleUser}
                    />

                    <NotificationSettings
                        prefs={notificationPrefs}
                        onPrefsChange={handleNotificationPrefsChange}
                    />

                    <PrivacySettings
                        prefs={privacyPrefs}
                        onPrefsChange={handlePrivacyPrefsChange}
                    />

                    <DangerZoneSettings />
                </div>
            </div>
        </div>
    );
}
