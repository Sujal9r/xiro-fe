"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import XiroLogo from "../../../components/XiroLogo";

export default function LegacyResetPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace("/forgot-password");
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#071120] px-6 text-white">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-xl">
        <XiroLogo size={56} className="mx-auto h-14 w-14 rounded-2xl" />
        <h1 className="mt-5 text-2xl font-semibold">Xiro password recovery has been updated</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">
          We now use a more secure OTP-based reset flow. Redirecting you to the new Xiro recovery
          screen.
        </p>
      </div>
    </div>
  );
}
