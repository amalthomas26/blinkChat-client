import { MessageSquare } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center p-4 selection:bg-purple-500/30">
      <div className="w-full max-w-[440px] flex flex-col items-center">
        <div className="w-12 h-12 bg-[#8b5cf6] rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
          <MessageSquare className="text-white" size={24} strokeWidth={2.5} />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <p className="text-slate-400 text-sm mb-8">{subtitle}</p>

        <div className="w-full bg-[#151b2b] border border-slate-800/60 rounded-2xl p-8 shadow-2xl">
          {children}
        </div>

        <p className="mt-8 text-xs text-slate-500 max-w-[320px] text-center leading-relaxed">
          By continuing, you agree to BlinkChat's Terms of Service and Privacy
          Policy
        </p>
      </div>
    </div>
  );
};
