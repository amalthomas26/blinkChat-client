import { apiFetch } from "../lib/api";

export interface SendOtpData {
    email: string;
    purpose: "email_verification" | "forgot_password"
}

export interface SendOtpData {
    email: string;
    purpose: "email_verification" | "forgot_password";
}

export interface VerifyOtpData {
    email: string;
    code: string;
    purpose: "email_verification" | "forgot_password";
}

export interface VerifyOtpResponse {
    success: boolean;
    data: {
        verifiedToken: string;
    };
}
export const otpService = {
    sendOtp: (data: SendOtpData) => {
        return apiFetch<{ success: boolean; message: string }>("/auth/otp/send", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },
    verifyOtp: (data: VerifyOtpData) => {
        return apiFetch<VerifyOtpResponse>("/auth/otp/verify", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },
};