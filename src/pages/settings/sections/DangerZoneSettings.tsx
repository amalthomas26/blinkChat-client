import { useState } from "react";
import { AlertTriangle, Loader2 } from "../../../components/ui/icons";
import { SettingsSection } from "../../../components/ui/SettingsSection";
import { userService } from "../../../services/user.service";
import { useAuthStore } from "../../../store/auth.store";

export function DangerZoneSettings() {
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const logout = useAuthStore((s) => s.logout);

    const handleDelete = async () => {
        if (confirmText !== "DELETE") {
            setError('Type "DELETE" to confirm');
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            await userService.deleteAccount();
            // Force logout on success
            await logout();
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : "Failed to delete account",
            );
            setIsDeleting(false);
        }
    };

    return (
        <SettingsSection title="Danger Zone" icon={AlertTriangle}>
            <div className="py-3">
                <p className="text-sm text-slate-400 mb-3">
                    Permanently delete your account and all associated data. This action
                    cannot be undone.
                </p>

                {!showConfirm ? (
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                        Delete my account
                    </button>
                ) : (
                    <div className="space-y-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                        <p className="text-sm text-red-300 font-medium">
                            Are you absolutely sure? Type{" "}
                            <code className="rounded bg-red-500/20 px-1 py-0.5 text-red-300">
                                DELETE
                            </code>{" "}
                            to confirm.
                        </p>

                        {error && (
                            <div className="text-xs text-red-400">{error}</div>
                        )}

                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder='Type "DELETE"'
                            className="w-full rounded-lg bg-[#0a0f1a] border border-red-500/30 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
                            autoFocus
                        />

                        <div className="flex gap-2">
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting || confirmText !== "DELETE"}
                                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                {isDeleting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Deleting...
                                    </span>
                                ) : (
                                    "Delete permanently"
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirm(false);
                                    setConfirmText("");
                                    setError(null);
                                }}
                                className="rounded-lg bg-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </SettingsSection>
    );
}
