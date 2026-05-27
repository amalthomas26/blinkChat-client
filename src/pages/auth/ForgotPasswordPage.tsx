import { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { Input } from "../../components/ui/Input";
import {
    emailRegex,
    emailMessage,
    passwordRegex,
    passwordMessage,
} from "../../lib/validations";
import { ApiError } from "../../lib/api";
import { otpService } from "../../services/otp.service";
import { authService } from "../../services/auth.service";

type ForgotStep = "email" | "otp" | "reset";

const RESEND_COOLDOWN_SECONDS = 60;

export const ForgotPasswordPage = () => {
    const navigate = useNavigate();

    const [step, setStep] = useState<ForgotStep>("email");
    const [email, setEmail] = useState("");
    const [verifiedToken, setVerifiedToken] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Resend cooldown
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

    const emailForm = useForm<{ email: string }>();
    const otpForm = useForm<{ otp: string }>();
    const resetForm = useForm<{ newPassword: string; confirmPassword: string }>();

    // Chrome ignores autoComplete="off" and autofills fields in multiple waves
    // after DOM paint. Fire setValue at 50ms, 150ms, and 300ms to catch all passes.
    useEffect(() => {
        if (step === "otp") {
            const clear = () => otpForm.setValue("otp", "");
            const t1 = setTimeout(clear, 50);
            const t2 = setTimeout(clear, 150);
            const t3 = setTimeout(clear, 300);
            return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
        }
        if (step === "reset") {
            const clear = () => {
                resetForm.setValue("newPassword", "");
                resetForm.setValue("confirmPassword", "");
            };
            const t1 = setTimeout(clear, 50);
            const t2 = setTimeout(clear, 150);
            const t3 = setTimeout(clear, 300);
            return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    // Step 1: Send OTP
    const handleSendOtp = async (data: { email: string }) => {
        setIsLoading(true);
        setError(null);
        try {
            await authService.forgotPassword(data.email);
            setEmail(data.email);
            otpForm.reset(); // clear before showing OTP field
            setStep("otp");
            startCooldown();
        } catch (err: unknown) {
            const message =
                err instanceof ApiError ? err.message : "Failed to send reset code";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    // Resend OTP
    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;
        setIsLoading(true);
        setError(null);
        try {
            await authService.forgotPassword(email);
            startCooldown();
        } catch (err: unknown) {
            const message =
                err instanceof ApiError ? err.message : "Failed to resend code";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (data: { otp: string }) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await otpService.verifyOtp({
                email,
                code: data.otp,
                purpose: "forgot_password",
            });
            setVerifiedToken(response.data.verifiedToken);
            resetForm.reset(); // clear before showing reset fields
            setStep("reset");
        } catch (err: unknown) {
            const message =
                err instanceof ApiError ? err.message : "Verification failed";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    // Step 3: Reset password
    const handleResetPassword = async (data: {
        newPassword: string;
        confirmPassword: string;
    }) => {
        if (data.newPassword !== data.confirmPassword) {
            resetForm.setError("confirmPassword", {
                message: "Passwords do not match",
            });
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await authService.resetPassword({
                email,
                newPassword: data.newPassword,
                verifiedToken,
            });
            setSuccessMessage(
                "Password reset successfully! Redirecting to login...",
            );
            setTimeout(() => navigate("/login", { replace: true }), 2000);
        } catch (err: unknown) {
            const message =
                err instanceof ApiError ? err.message : "Password reset failed";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    // Step 1 UI
    if (step === "email") {
        return (
            <AuthLayout
                title="Reset your password"
                subtitle="Enter your email to receive a verification code"
            >
                <form
                    // eslint-disable-next-line react-hooks/refs
                    onSubmit={emailForm.handleSubmit(handleSendOtp)}
                    autoComplete="off"
                    className="space-y-4 flex flex-col"
                >
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center">
                            {error}
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
                        disabled={isLoading}
                        className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-2.5 rounded-lg transition-colors mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Sending code..." : "Send verification code"}
                    </button>
                    <p className="text-center text-sm text-slate-400 mt-6">
                        Remember your password?{" "}
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

    // Step 2 UI
    if (step === "otp") {
        return (
            <AuthLayout
                title="Enter verification code"
                subtitle={`We sent a code to ${email}`}
            >
                <form
                    onSubmit={otpForm.handleSubmit(handleVerifyOtp)}
                    autoComplete="off"
                    className="space-y-4 flex flex-col"
                >
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}
                    <Input
                        label="Verification Code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="Enter 6-digit code"
                        registration={otpForm.register("otp", {
                            required: "Code is required",
                            pattern: {
                                value: /^\d{6}$/,
                                message: "Must be a 6-digit number",
                            },
                        })}
                        error={otpForm.formState.errors.otp?.message}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-2.5 rounded-lg transition-colors mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Verifying..." : "Verify Code"}
                    </button>
                    <div className="flex items-center justify-between text-sm mt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setStep("email");
                                setError(null);
                            }}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            ← Change email
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleResendOtp()}
                            disabled={resendCooldown > 0 || isLoading}
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

    // Step 3 UI
    return (
        <AuthLayout title="Set new password" subtitle="Create a strong new password">
            <form
                key="reset-form"
                onSubmit={resetForm.handleSubmit(handleResetPassword)}
                autoComplete="off"
                className="space-y-4 flex flex-col"
            >
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center">
                        {error}
                    </div>
                )}
                {successMessage && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-3 rounded-lg text-center">
                        {successMessage}
                    </div>
                )}
                <Input
                    label="New Password"
                    type="password"
                    placeholder="Enter new password"
                    registration={resetForm.register("newPassword", {
                        required: "Password is required",
                        pattern: { value: passwordRegex, message: passwordMessage },
                    })}
                    error={resetForm.formState.errors.newPassword?.message}
                />
                <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="Confirm new password"
                    registration={resetForm.register("confirmPassword", {
                        required: "Please confirm your password",
                    })}
                    error={resetForm.formState.errors.confirmPassword?.message}
                />
                <button
                    type="submit"
                    disabled={isLoading || !!successMessage}
                    className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-2.5 rounded-lg transition-colors mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Resetting..." : "Reset Password"}
                </button>
            </form>
        </AuthLayout>
    );
};
