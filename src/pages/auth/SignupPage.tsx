// client/src/pages/auth/SignupPage.tsx

import { useState, useRef, useEffect,useCallback} from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { Input } from "../../components/ui/Input";
import { GoogleAuthButton } from "../../components/auth/GoogleAuthButton";
import {
  emailRegex,
  emailMessage,
  passwordRegex,
  passwordMessage,
} from "../../lib/validations";
import type { RegisterData } from "../../types/auth.types";
import { ApiError } from "../../lib/api";
import { useAuthActions, useAuthLoading } from "../../store/auth.selectors";
import { otpService } from "../../services/otp.service";

type SignupStep = "email" | "otp" | "details";

interface EmailStepData {
  email: string;
}

interface OtpStepData {
  otp: string;
}

interface DetailsStepData {
  name: string;
  username: string;
  password: string;
}


// const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export const SignupPage = () => {
  const navigate = useNavigate();
  const isLoading = useAuthLoading();
  const { register: registerAction, googleAuth } = useAuthActions();

  //Multi-step state 
  // These live in React state (NOT Zustand) because they're
  // ephemeral and tab-specific. If the user opens a new tab,
  // they start fresh — that's correct behavior.
  const [step, setStep] = useState<SignupStep>("email");
  const [email, setEmail] = useState("");
  const [verifiedToken, setVerifiedToken] = useState("");
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  //Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const emailForm = useForm<EmailStepData>();
  const otpForm = useForm<OtpStepData>();
  const detailsForm = useForm<DetailsStepData>();

  // Chrome ignores autoComplete="off" and autofills fields in multiple waves
  // after DOM paint. We fire setValue at 50ms, 150ms, and 300ms to catch all
  // of Chrome's autofill passes.
  useEffect(() => {
    if (step === "otp") {
      const t1 = setTimeout(() => otpForm.setValue("otp", ""), 50);
      const t2 = setTimeout(() => otpForm.setValue("otp", ""), 150);
      const t3 = setTimeout(() => otpForm.setValue("otp", ""), 300);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
    if (step === "details") {
      const clear = () => {
        detailsForm.setValue("name", "");
        detailsForm.setValue("username", "");
      };
      const t1 = setTimeout(clear, 50);
      const t2 = setTimeout(clear, 150);
      const t3 = setTimeout(clear, 300);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleSendOtp = async (data: EmailStepData) => {
    setIsOtpLoading(true);
    setOtpError(null);
    try {
      await otpService.sendOtp({
        email: data.email,
        purpose: "email_verification",
      });
      setEmail(data.email);
      otpForm.reset(); // clear any stale OTP value before showing the field
      setStep("otp");
      startCooldown();
    } catch (error: unknown) {
      const message =
        error instanceof ApiError ? error.message : "Failed to send OTP";
      setOtpError(message);
    } finally {
      setIsOtpLoading(false);
    }
  };


  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsOtpLoading(true);
    setOtpError(null);
    try {
      await otpService.sendOtp({
        email,
        purpose: "email_verification",
      });
      startCooldown();
    } catch (error: unknown) {
      const message =
        error instanceof ApiError ? error.message : "Failed to resend OTP";
      setOtpError(message);
    } finally {
      setIsOtpLoading(false);
    }
  };


  const handleVerifyOtp = async (data: OtpStepData) => {
    setIsOtpLoading(true);
    setOtpError(null);
    try {
      const response = await otpService.verifyOtp({
        email,
        code: data.otp,
        purpose: "email_verification",
      });
      setVerifiedToken(response.data.verifiedToken);
      detailsForm.reset(); // clear any stale values before showing details form
      setStep("details");
    } catch (error: unknown) {
      const message =
        error instanceof ApiError ? error.message : "Verification failed";
      setOtpError(message);
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleRegister = async (data: DetailsStepData) => {
    try {
      const registerData: RegisterData = {
        name: data.name,
        email,
        password: data.password,
        username: data.username || undefined,
        verifiedToken,
      };
      await registerAction(registerData);
      navigate("/login", {
        replace: true,
        state: { message: "Account created! Please log in." },
      });
    } catch (error: unknown) {
      const message =
        error instanceof ApiError ? error.message : "Signup failed";
      detailsForm.setError("root", { message });
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
      emailForm.setError("root", { message });
    }
  };


  if (step === "email") {
    return (
      <AuthLayout title="Create your account" subtitle="Join BlinkChat today">
        <form
          // eslint-disable-next-line react-hooks/refs
          onSubmit={emailForm.handleSubmit(handleSendOtp)}
          autoComplete="off"
          className="space-y-4 flex flex-col"
        >
          {(otpError || emailForm.formState.errors.root) && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center">
              {otpError || emailForm.formState.errors.root?.message}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            registration={emailForm.register("email", {
              required: "Email is required",
              pattern: { value: emailRegex, message: emailMessage },
            })}
            error={emailForm.formState.errors.email?.message}
          />
          <button
            type="submit"
            disabled={isOtpLoading}
            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-2.5 rounded-lg transition-colors mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isOtpLoading ? "Sending code..." : "Continue"}
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
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#8b5cf6] hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </form>
      </AuthLayout>
    );
  }


  if (step === "otp") {
    return (
      <AuthLayout
        title="Verify your email"
        subtitle={`Enter the 6-digit code sent to ${email}`}
      >
        <form
          onSubmit={otpForm.handleSubmit(handleVerifyOtp)}
          autoComplete="off"
          className="space-y-4 flex flex-col"
        >
          {otpError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center">
              {otpError}
            </div>
          )}
          <Input
            label="Verification Code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter 6-digit code"
            registration={otpForm.register("otp", {
              required: "OTP is required",
              pattern: {
                value: /^\d{6}$/,
                message: "Must be a 6-digit number",
              },
            })}
            error={otpForm.formState.errors.otp?.message}
          />
          <button
            type="submit"
            disabled={isOtpLoading}
            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-2.5 rounded-lg transition-colors mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isOtpLoading ? "Verifying..." : "Verify Code"}
          </button>

          <div className="flex items-center justify-between text-sm mt-2">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtpError(null);
              }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Change email
            </button>
            <button
              type="button"
              onClick={() => void handleResendOtp()}
              disabled={resendCooldown > 0 || isOtpLoading}
              className="text-[#8b5cf6] hover:text-[#a78bfa] transition-colors disabled:text-slate-600 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend code"}
            </button>
          </div>
        </form>
      </AuthLayout>
    );
  }


  return (
    <AuthLayout
      title="Complete your profile"
      subtitle="Almost there! Fill in your details"
    >
      <form
        key="details-form"
        onSubmit={detailsForm.handleSubmit(handleRegister)}
        autoComplete="off"
        className="space-y-4 flex flex-col"
      >
        {detailsForm.formState.errors.root && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center">
            {detailsForm.formState.errors.root?.message}
          </div>
        )}
        <Input
          label="Full Name"
          autoComplete="off"
          placeholder="John Doe"
          registration={detailsForm.register("name", {
            required: "Name is required",
          })}
          error={detailsForm.formState.errors.name?.message}
        />
        <Input
          label="Username (optional)"
          placeholder="johndoe"
          registration={detailsForm.register("username", {
            pattern: {
              value: /^[a-z0-9_]{3,30}$/,
              message:
                "3-30 characters: lowercase letters, numbers, underscores",
            },
          })}
          error={detailsForm.formState.errors.username?.message}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Create a strong password"
          registration={detailsForm.register("password", {
            required: "Password is required",
            pattern: { value: passwordRegex, message: passwordMessage },
          })}
          error={detailsForm.formState.errors.password?.message}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-2.5 rounded-lg transition-colors mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating account..." : "Create account"}
        </button>
        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[#8b5cf6] hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};
