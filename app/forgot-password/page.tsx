"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SettingsDrawer from "../../components/SettingsDrawer";
import XiroLogo from "../../components/XiroLogo";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://xiro-be.onrender.com";

type Step = 1 | 2 | 3;

const STEP_CONTENT: Record<
  Step,
  {
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  1: {
    eyebrow: "Xiro Account Recovery",
    title: "Reset your password with a secure OTP flow",
    description:
      "Enter your work email and we will send a one-time password to verify your identity.",
  },
  2: {
    eyebrow: "Email Verification",
    title: "Enter the OTP sent to your inbox",
    description:
      "Use the 6-digit verification code from your email to continue to the password update step.",
  },
  3: {
    eyebrow: "Create New Password",
    title: "Choose a strong password for your Xiro account",
    description:
      "Set a new password and confirm it before signing back in to your workspace.",
  },
};

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetSessionToken, setResetSessionToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpResendLoading, setOtpResendLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const progressWidth = useMemo(() => {
    if (step === 1) return "33%";
    if (step === 2) return "66%";
    return "100%";
  }, [step]);

  const setFeedback = (nextMessage: string, error = false) => {
    setMessage(nextMessage);
    setIsError(error);
  };

  const sendOtp = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!email.trim()) {
      setFeedback("Enter your email address to continue.", true);
      return;
    }

    setLoading(true);
    setFeedback("");

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();
      if (!response.ok) {
        setFeedback(data.message || "Unable to send OTP right now.", true);
        return;
      }

      setOtp("");
      setResetSessionToken("");
      setPassword("");
      setConfirmPassword("");
      setStep(2);
      setFeedback(data.message || "OTP sent successfully.");
    } catch {
      setFeedback("We could not reach the server. Please try again.", true);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (otp.trim().length !== 6) {
      setFeedback("Enter the 6-digit OTP from your email.", true);
      return;
    }

    setLoading(true);
    setFeedback("");

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setFeedback(data.message || "OTP verification failed.", true);
        return;
      }

      setResetSessionToken(data.resetSessionToken || "");
      setStep(3);
      setFeedback(data.message || "OTP verified successfully.");
    } catch {
      setFeedback("Unable to verify OTP right now. Please try again.", true);
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();

    if (!password || !confirmPassword) {
      setFeedback("Enter and confirm your new password.", true);
      return;
    }
    if (password.length < 6) {
      setFeedback("Password must be at least 6 characters long.", true);
      return;
    }
    if (password !== confirmPassword) {
      setFeedback("New password and confirm password must match.", true);
      return;
    }
    if (!resetSessionToken) {
      setFeedback("Your verification session expired. Please verify OTP again.", true);
      setStep(2);
      return;
    }

    setLoading(true);
    setFeedback("");

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          resetSessionToken,
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setFeedback(data.message || "Password reset failed.", true);
        return;
      }

      setFeedback("Password updated successfully. Redirecting to login...");
      setTimeout(() => router.push("/login"), 1400);
    } catch {
      setFeedback("We could not update your password. Please try again.", true);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!email.trim()) return;

    setOtpResendLoading(true);
    setFeedback("");
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFeedback(data.message || "Unable to resend OTP.", true);
        return;
      }
      setFeedback(data.message || "A fresh OTP has been sent to your inbox.");
    } catch {
      setFeedback("Unable to resend OTP right now. Please try again.", true);
    } finally {
      setOtpResendLoading(false);
    }
  };

  const goBackToPreviousStep = () => {
    if (step === 3) {
      setStep(2);
      setFeedback("");
      return;
    }
    if (step === 2) {
      setStep(1);
      setOtp("");
      setFeedback("");
    }
  };

  const currentContent = STEP_CONTENT[step];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#071120] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.28),transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(14,165,233,0.2),transparent_28%),linear-gradient(180deg,#071120_0%,#0b1730_45%,#0f1b36_100%)]" />
      <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-sky-400/10 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-[26rem] w-[26rem] rounded-full bg-blue-600/15 blur-[140px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden lg:flex flex-col justify-between p-8 xl:p-10">
            <div>
              <div className="flex items-center gap-3 text-2xl font-semibold">
                <XiroLogo size={46} className="h-11 w-11 rounded-2xl shadow-lg" />
                <div>
                  <div>Xiro</div>
                  <div className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">
                    Secure Recovery
                  </div>
                </div>
              </div>
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/70">
                Recover account access without confusion. Xiro verifies your identity with a
                one-time password and guides you through a clear reset journey.
              </p>
            </div>

            <div className="space-y-4">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.24em] text-sky-100/80">
                Trusted account recovery
              </div>
              <h2 className="max-w-md text-[2rem] font-semibold leading-tight text-white">
                Fast, secure password reset designed for real workspace access.
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "Email OTP verification",
                  "Step-by-step reset journey",
                  "Professional Xiro experience",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-sm text-white/75"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-white/45">© 2026 Xiro. Secure workspace access.</div>
          </section>

          <section className="bg-white px-5 py-6 text-gray-900 sm:px-7 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-600">
                    {currentContent.eyebrow}
                  </div>
                  <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight text-gray-950">
                    {currentContent.title}
                  </h1>
                  <p className="mt-2.5 text-sm leading-6 text-gray-500">{currentContent.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="hidden rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:border-blue-200 hover:text-blue-600 sm:inline-flex"
                >
                  Back to login
                </button>
              </div>

              <div className="mt-6">
                <div className="mb-2.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  <span>Recovery progress</span>
                  <span>Step {step} of 3</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-300"
                    style={{ width: progressWidth }}
                  />
                </div>
              </div>

              {message ? (
                <div
                  className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                    isError
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              {step === 1 ? (
                <form onSubmit={sendOtp} className="mt-6 space-y-4.5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Work Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </button>
                </form>
              ) : null}

              {step === 2 ? (
                <form onSubmit={verifyOtp} className="mt-6 space-y-4.5">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    OTP sent to <span className="font-semibold">{email}</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm tracking-[0.28em] text-gray-900 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={goBackToPreviousStep}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                    >
                      Change Email
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? "Verifying OTP..." : "Verify OTP"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={otpResendLoading}
                    className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 disabled:opacity-70"
                  >
                    {otpResendLoading ? "Resending OTP..." : "Resend OTP"}
                  </button>
                </form>
              ) : null}

              {step === 3 ? (
                <form onSubmit={updatePassword} className="mt-6 space-y-4.5">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Email verified for <span className="font-semibold">{email}</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a secure password"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-18 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Re-enter Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-18 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500"
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={goBackToPreviousStep}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? "Updating Password..." : "Save New Password"}
                    </button>
                  </div>
                </form>
              ) : null}

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="mt-6 text-sm font-semibold text-gray-600 transition hover:text-blue-600 sm:hidden"
              >
                Back to login
              </button>
            </div>
          </section>
        </div>
      </div>

      <SettingsDrawer />
    </div>
  );
}
