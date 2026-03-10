"use client";

import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import SettingsDrawer from "../../components/SettingsDrawer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function Signup() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      password: "",
      phoneNumber: "",
    },
    validationSchema: Yup.object({
      firstName: Yup.string().required("First name is required"),
      middleName: Yup.string(),
      lastName: Yup.string().required("Last name is required"),
      email: Yup.string().email("Invalid email").required("Email is required"),
      password: Yup.string().min(6, "Min 6 chars").required("Password is required"),
      phoneNumber: Yup.string().required("Phone number is required"),
    }),
    onSubmit: async (values) => {
      setMessage("");
      setLoading(true);
      try {
        const name = [values.firstName, values.middleName, values.lastName]
          .filter((part) => part && part.trim())
          .join(" ");
        const res = await fetch(`${API_URL}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, name }),
        });
        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Signup failed");
          setIsError(true);
          return;
        }

        setMessage("Signup successful");
        setIsError(false);
        setTimeout(() => router.push("/login"), 800);
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
      <div className="absolute -top-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-blue-600/25 blur-[120px]" />
      <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-blue-400/20 blur-[130px]" />

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
                  Get access to attendance, leaves, and team controls.
                </p>
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-semibold leading-tight">
                  Create your workspace account.
                </h2>
                <p className="text-white/70">
                  Set up your profile in minutes and start collaborating.
                </p>
                <div className="grid grid-cols-3 gap-3 text-xs text-white/70">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">Quick setup</div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">Secure access</div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">Team ready</div>
                </div>
              </div>
              <div className="text-xs text-white/50">© 2026 Atto Workspace</div>
            </div>

            <div className="bg-white text-gray-900 p-8 sm:p-10">
              <h1 className="text-2xl font-semibold">Create account</h1>
              <p className="text-sm text-gray-500 mt-1">
                Join the platform and manage your workspace.
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

              <form onSubmit={formik.handleSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">First name</label>
                    <input
                      name="firstName"
                      placeholder="Alex"
                      value={formik.values.firstName}
                      onChange={formik.handleChange}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                    />
                    {formik.errors.firstName && formik.touched.firstName && (
                      <p className="text-red-600 text-xs mt-1">{formik.errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Last name</label>
                    <input
                      name="lastName"
                      placeholder="Johnson"
                      value={formik.values.lastName}
                      onChange={formik.handleChange}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                    />
                    {formik.errors.lastName && formik.touched.lastName && (
                      <p className="text-red-600 text-xs mt-1">{formik.errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Middle name (optional)</label>
                  <input
                    name="middleName"
                    placeholder=""
                    value={formik.values.middleName}
                    onChange={formik.handleChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Email</label>
                  <input
                    name="email"
                    placeholder="name@company.com"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                  />
                  {formik.errors.email && formik.touched.email && (
                    <p className="text-red-600 text-xs mt-1">{formik.errors.email}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Phone number</label>
                  <input
                    name="phoneNumber"
                    placeholder="+1 555 010 2000"
                    value={formik.values.phoneNumber}
                    onChange={formik.handleChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                  />
                  {formik.errors.phoneNumber && formik.touched.phoneNumber && (
                    <p className="text-red-600 text-xs mt-1">{formik.errors.phoneNumber}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Create a secure password"
                      value={formik.values.password}
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
                  {formik.errors.password && formik.touched.password && (
                    <p className="text-red-600 text-xs mt-1">{formik.errors.password}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-xl font-semibold"
                >
                  {loading ? "Creating account..." : "Sign up"}
                </button>
              </form>

              <div className="mt-6 text-sm text-gray-500">
                Already have an account?{" "}
                <button
                  className="font-semibold text-gray-700 hover:text-blue-600"
                  onClick={() => router.push("/login")}
                >
                  Login
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
