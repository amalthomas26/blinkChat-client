import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { Input } from "../../components/ui/Input";
import { GoogleAuthButton } from "../../components/auth/GoogleAuthButton";
import { emailRegex, emailMessage } from "../../lib/validations";
import type { LoginData } from "../../types/auth.types";
import { ApiError } from "../../lib/api";
import { useAuthActions, useAuthLoading } from "../../store/auth.selectors";

export const LoginPage = () => {
  const navigate = useNavigate();

  const isLoading = useAuthLoading();
  const { login, googleAuth } = useAuthActions();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginData>();
  const onSubmit = async (data: LoginData) => {
    try {
      await login(data);
      navigate("/chat", { replace: true });
    } catch (error: unknown) {
      const message =
        error instanceof ApiError ? error.message : "Login failed";
      setError("root", { message });
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
