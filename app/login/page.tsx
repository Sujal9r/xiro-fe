"use client";

import { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import { PERMISSIONS, PermissionKey } from "../../lib/permissions";
import SettingsDrawer from "../../components/SettingsDrawer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function Login() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      const parsedUser = JSON.parse(user);
      const permissions = (parsedUser.permissions || []) as PermissionKey[];
      router.push(getDefaultPath(permissions));
    }
  }, [router]);

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: Yup.object({
      email: Yup.string().email("Invalid email").required("Required"),
      password: Yup.string().min(6, "Min 6 chars").required("Required"),
    }),
    onSubmit: async (values) => {
      setMessage("");
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Login failed");
          setIsError(true);
          return;
        }

        setMessage("Login successful");
        setIsError(false);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        const permissions = (data.user.permissions || []) as PermissionKey[];
        setTimeout(() => router.push(getDefaultPath(permissions)), 600);
      } catch {
        setMessage("Server error");
        setIsError(true);
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),transparent_45%)]" />
      <div className="absolute -top-32 -left-10 h-80 w-80 rounded-full bg-blue-600/30 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-400/20 blur-[140px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="hidden lg:flex flex-col justify-between p-12">
              <div>
                <div className="flex items-center gap-3 text-2xl font-semibold">
                  <span className="h-10 w-10 rounded-2xl bg-white/90 text-gray-900 flex items-center justify-center">
                    A
                  </span>
                  Atto Workspace
                </div>
                <p className="mt-3 text-white/70 text-sm">
                  Attendance, leaves, and team operations in one place.
                </p>
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-semibold leading-tight">
                  Sign in to manage your day.
                </h2>
                <p className="text-white/70">
                  Monitor attendance, approve leaves, and track team activity with confidence.
                </p>
                <div className="grid grid-cols-3 gap-3 text-xs text-white/70">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    Live attendance
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    Leave approvals
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    Role control
                  </div>
                </div>
              </div>
              <div className="text-xs text-white/50">© 2026 Atto Workspace</div>
            </div>

            <div className="bg-white text-gray-900 p-8 sm:p-10">
              <h1 className="text-2xl font-semibold">Welcome back</h1>
              <p className="text-sm text-gray-500 mt-1">
                Enter your credentials to access your dashboard.
              </p>

              {message && (
                <p
                  className={`mt-4 text-center text-sm font-semibold ${
                    isError ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {message}
                </p>
              )}

              <form onSubmit={formik.handleSubmit} className="mt-6 space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Email address</label>
                  <input
                    name="email"
                    placeholder="name@company.com"
                    onChange={formik.handleChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      onChange={formik.handleChange}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-xs font-semibold text-gray-500"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-xl font-semibold"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 text-sm text-gray-500">
                <button
                  onClick={() => router.push("/signup")}
                  className="text-left font-semibold text-gray-700 hover:text-blue-600"
                >
                  Create account
                </button>
                <button
                  onClick={() => router.push("/forgot-password")}
                  className="text-left font-semibold text-gray-700 hover:text-blue-600"
                >
                  Forgot password?
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SettingsDrawer />
    </div>
  );
}

const getDefaultPath = (permissions: PermissionKey[]) => {
  if (permissions.includes(PERMISSIONS.VIEW_DASHBOARD)) {
    return "/dashboard";
  }
  return "/profile";
};
