import { Loader2 } from "./icons";

interface SettingsToggleProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    loading?: boolean;
}

export function SettingsToggle({
    label,
    description,
    checked,
    onChange,
    disabled = false,
    loading = false,
}: SettingsToggleProps) {
    const handleClick = () => {
        if (disabled || loading) return;
        onChange(!checked);
    };

    return (
        <div className="flex items-center justify-between py-3">
            {/* Clicking the label/description area also toggles */}
            <div
                className="flex-1 min-w-0 pr-4 cursor-pointer select-none"
                onClick={handleClick}
            >
                <p className="text-sm font-medium text-slate-200">{label}</p>
                {description && (
                    <p className="text-xs text-slate-400 mt-0.5">{description}</p>
                )}
            </div>

            {/* The toggle button itself — directly handles click, no stopPropagation needed */}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled || loading}
                onClick={handleClick}
                className={`
          relative inline-flex h-6 w-11 shrink-0 items-center rounded-full
          transition-colors duration-200 ease-in-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]
          disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
          ${checked ? "bg-[#8b5cf6]" : "bg-slate-600"}
        `}
            >
                {loading ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    </span>
                ) : (
                    <span
                        className={`
              inline-block h-4 w-4 rounded-full bg-white shadow-sm
              transition-transform duration-200 ease-in-out
              ${checked ? "translate-x-6" : "translate-x-1"}
            `}
                    />
                )}
            </button>
        </div>
    );
}
