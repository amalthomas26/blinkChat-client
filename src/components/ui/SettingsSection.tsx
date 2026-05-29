import type { ReactNode } from "react";
import type { LucideIcon } from "./icons";

interface SettingsSectionProps {
    title: string;
    icon?: LucideIcon;
    children: ReactNode;
    accentColor?: string;
}

export function SettingsSection({
    title,
    icon: Icon,
    children,
    accentColor,
}: SettingsSectionProps) {
    return (
        <section
            className={`
        bg-[#111827]/60 backdrop-blur-sm rounded-xl border border-slate-800/50 p-5
        ${accentColor ? `border-l-2 border-l-${accentColor}` : ""}
      `}
        >
            <div className="flex items-center gap-2.5 mb-4">
                {Icon && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e293b]">
                        <Icon className="h-4 w-4 text-[#8b5cf6]" />
                    </div>
                )}
                <h2 className="text-base font-semibold text-slate-100">{title}</h2>
            </div>

            <div className="divide-y divide-slate-800/50">{children}</div>
        </section>
    );
}
