import { Palette } from "lucide-react";
import { SettingsSection } from "../../../components/ui/SettingsSection";
import { useUIStore } from "../../../store/ui.store";

// Accent color options
// const ACCENT_COLORS = [
//   { name: "Purple", value: "#8b5cf6" },
//   { name: "Blue", value: "#3b82f6" },
//   { name: "Green", value: "#10b981" },
//   { name: "Rose", value: "#f43f5e" },
//   { name: "Amber", value: "#f59e0b" },
//   { name: "Cyan", value: "#06b6d4" },
// ];

export function AppearanceSettings() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const fontSize = useUIStore((s) => s.fontSize);
  const setFontSize = useUIStore((s) => s.setFontSize);

  return (
    <SettingsSection title="Appearance" icon={Palette}>

      <div className="py-3">
        <p className="text-sm font-medium text-slate-200 mb-3">Theme</p>
        <div className="flex gap-2">
          {(["dark", "light", "system"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setTheme(option)}
              className={`
                flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium capitalize transition-colors
                ${
                  theme === option
                    ? "border-[#8b5cf6] bg-[#8b5cf6]/10 text-[#8b5cf6]"
                    : "border-slate-700 bg-[#0a0f1a] text-slate-400 hover:border-slate-600 hover:text-slate-300"
                }
              `}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

     
      <div className="py-3">
        <p className="text-sm font-medium text-slate-200 mb-3">
          Chat font size
        </p>
        <div className="flex gap-2">
          {(["normal", "large"] as const).map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={`
                flex-1 rounded-lg border px-3 py-2.5 font-medium capitalize transition-colors
                ${size === "large" ? "text-base" : "text-sm"}
                ${
                  fontSize === size
                    ? "border-[#8b5cf6] bg-[#8b5cf6]/10 text-[#8b5cf6]"
                    : "border-slate-700 bg-[#0a0f1a] text-slate-400 hover:border-slate-600 hover:text-slate-300"
                }
              `}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}
