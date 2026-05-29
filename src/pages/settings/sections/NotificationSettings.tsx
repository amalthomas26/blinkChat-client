import { useState } from "react";
import { Bell } from "../../../components/ui/icons";
import { SettingsSection } from "../../../components/ui/SettingsSection";
import { SettingsToggle } from "../../../components/ui/SettingsToggle";
import { userService } from "../../../services/user.service";
import type { NotificationPrefs } from "../../../types/auth.types";

interface NotificationSettingsProps {
    prefs: NotificationPrefs;
    onPrefsChange: (prefs: NotificationPrefs) => void;
}

export function NotificationSettings({
    prefs,
    onPrefsChange,
}: NotificationSettingsProps) {
    const [loadingField, setLoadingField] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleToggle = async (
        field: keyof NotificationPrefs,
        newValue: boolean,
    ) => {
        // Optimistic update
        const prevPrefs = { ...prefs };
        onPrefsChange({ ...prefs, [field]: newValue });

        setLoadingField(field);
        setError(null);

        try {
            const res = await userService.updateNotificationPrefs({
                [field]: newValue,
            });
            // Sync with server response (source of truth)
            onPrefsChange(res.data);
        } catch (err: unknown) {
            // Revert on failure
            onPrefsChange(prevPrefs);
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to update notification settings",
            );
        } finally {
            setLoadingField(null);
        }
    };

    const handleBrowserNotificationToggle = async (newValue: boolean) => {
        if (newValue && typeof Notification !== "undefined") {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                setError(
                    "Browser notification permission denied. Please allow notifications in your browser settings.",
                );
                return;
            }
        }
        handleToggle("browserNotifications", newValue);
    };

    return (
        <SettingsSection title="Notifications" icon={Bell}>
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2 rounded-md mb-2">
                    {error}
                </div>
            )}

            <SettingsToggle
                label="Browser notifications"
                description="Show desktop notifications for new messages"
                checked={prefs.browserNotifications}
                onChange={handleBrowserNotificationToggle}
                loading={loadingField === "browserNotifications"}
            />

            <SettingsToggle
                label="Message sounds"
                description="Play a sound when you receive a message"
                checked={prefs.sounds}
                onChange={(v) => handleToggle("sounds", v)}
                loading={loadingField === "sounds"}
            />

            <SettingsToggle
                label="Mute all"
                description="Silence all notifications and sounds"
                checked={prefs.muteAll}
                onChange={(v) => handleToggle("muteAll", v)}
                loading={loadingField === "muteAll"}
            />
        </SettingsSection>
    );
}
