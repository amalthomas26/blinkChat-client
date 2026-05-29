import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { Input } from "../../components/ui/Input";
import { GoogleAuthButton } from "../../components/auth/GoogleAuthButton";
import { emailRegex, emailMessage } from "../../lib/validations";
import type { LoginData } from "../../types/auth.types";
import { ApiError } from "../../lib/api";
import { useAuthActions, useAuthLoading } from "../../store/auth.selectors";
import { ArrowLeft, Loader2 } from "../../components/ui/icons";

type Step = "credentials" | "2fa";

export const LoginPage = () => {
  const navigate = useNavigate();
  const isLoading = useAuthLoading();
  const { login, googleAuth, verifyLogin2FA } = useAuthActions();

  const [step, setStep] = useState<Step>("credentials");
  const [twoFAEmail, setTwoFAEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    getValues,
  } = useForm<LoginData>();


  const onSubmit = async (data: LoginData) => {
    try {
      await login(data);
      // If we get here, login succeeded (no 2FA)
      navigate("/chat", { replace: true });
    } catch (error: unknown) {
      // Check for 2FA signal from auth store
      if (error instanceof Error && error.message === "2FA_REQUIRED") {
        const err = error as Error & { email: string };
        setTwoFAEmail(err.email);
        setStep("2fa");
        setOtpCode("");
        setOtpError(null);
        return;
      }

      const message =
        error instanceof ApiError ? error.message : "Login failed";
      setError("root", { message });
    }
  };

  const handleVerify2FA = async () => {
    if (!otpCode.trim()) {
      setOtpError("Please enter the verification code");
      return;
    }

    setIsVerifying(true);
    setOtpError(null);

    try {
      await verifyLogin2FA(twoFAEmail, otpCode.trim());
      navigate("/chat", { replace: true });
    } catch (error: unknown) {
      setOtpError(
        error instanceof ApiError
          ? error.message
          : "Verification failed. Please try again.",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  
  // Re-submit the original credentials to trigger another OTP
  const handleResend = async () => {
    setIsResending(true);
    setResendMessage(null);
    setOtpError(null);

    try {
      const data = getValues(); // get the email/password from the form
      await login(data);
      // If login succeeds without 2FA this time (user disabled 2FA
      // in another tab), just navigate
      navigate("/chat", { replace: true });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "2FA_REQUIRED") {
        setResendMessage("A new code has been sent to your email");
        setOtpCode("");
        return;
      }
      setOtpError(
        error instanceof ApiError
          ? error.message
          : "Failed to resend code",
      );
    } finally {
      setIsResending(false);
    }
  };


  const handleGoogleSuccess = async (token: string) => {
    try {
      await googleAuth(token);
      navigate("/chat", { replace: true });
    } catch (error: unknown) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Google authentication failed";
      setError("root", { message });
    }
  };

  if (step === "2fa") {
    return (
      <AuthLayout
        title="Verify your identity"
        subtitle={`Enter the 6-digit code sent to ${twoFAEmail}`}
      >
        <div className="space-y-4 flex flex-col">
          {otpError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center">
              {otpError}
            </div>
          )}

          {resendMessage && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-3 rounded-lg text-center">
              {resendMessage}
            </div>
          )}

        
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Verification code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otpCode}
              onChange={(e) => {
                // Only allow digits
                const val = e.target.value.replace(/\D/g, "");
                setOtpCode(val);
              }}
              placeholder="000000"
              className="w-full rounded-lg bg-[#0d1117] border border-slate-700 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-slate-200 placeholder:text-slate-600 focus:border-[#8b5cf6] focus:outline-none transition-colors"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleVerify2FA();
              }}
            />
          </div>

       
          <button
            onClick={handleVerify2FA}
            disabled={isVerifying || otpCode.length < 6}
            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </span>
            ) : (
              "Verify & sign in"
            )}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => {
                setStep("credentials");
                setOtpCode("");
                setOtpError(null);
                setResendMessage(null);
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to login
            </button>

            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-[#8b5cf6] hover:underline disabled:opacity-50"
            >
              {isResending ? "Sending..." : "Resend code"}
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Welcome to BlinkChat" subtitle="Sign in to continue">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 flex flex-col"
      >
        {errors.root && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center">
            {errors.root?.message}
          </div>
        )}
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          registration={register("email", {
            required: "Email is required",
            pattern: { value: emailRegex, message: emailMessage },
          })}
          error={errors.email?.message}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          registration={register("password", {
            required: "Password is required",
          })}
          error={errors.password?.message}
        />
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-xs text-[#8b5cf6] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-2.5 rounded-lg transition-colors mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
        <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">
            Or continue with
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>
        <GoogleAuthButton
          onSuccess={handleGoogleSuccess}
          isLoading={isLoading}
        />
        <p className="text-center text-sm text-slate-400 mt-6">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-[#8b5cf6] hover:underline font-medium"
          >
            Sign up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};
