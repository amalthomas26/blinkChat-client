import { useState } from "react";
import { Eye, EyeOff } from "./icons";
import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "../../lib/utils.ts";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  type = "text",
  registration,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <div className="relative">
        <input
          type={isPassword && showPassword ? "text" : type}
          className={cn(
            "w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500",
            "focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          )}
          {...registration}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
};
