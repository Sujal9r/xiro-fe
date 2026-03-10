"use client";

import { useRouter } from "next/navigation";
import SettingsDrawer from "../components/SettingsDrawer";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),transparent_45%)]" />
      <div className="absolute -top-40 left-[-10%] h-[420px] w-[420px] rounded-full bg-blue-600/30 blur-[140px]" />
      <div className="absolute bottom-0 right-0 h-[460px] w-[460px] rounded-full bg-blue-400/20 blur-[160px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-14">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-2xl font-semibold">
            <span className="h-11 w-11 rounded-2xl bg-white text-gray-900 flex items-center justify-center">
              A
            </span>
            Atto Workspace
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/login")}
              className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
            >
              Log in
            </button>
            <button
              onClick={() => router.push("/signup")}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Get started
            </button>
          </div>
        </header>

        <section className="mt-16 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
              Workforce Operations
            </p>
            <h1 className="text-5xl font-semibold leading-tight">
              A modern workspace for attendance, leaves, and team approvals.
            </h1>
            <p className="text-lg text-white/70">
              Keep your team in sync with real-time attendance panels, leave workflows, and
              permission-based access across every role.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push("/login")}
                className="rounded-2xl bg-white text-gray-900 px-6 py-3 font-semibold hover:bg-gray-100"
              >
                Sign in
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="rounded-2xl border border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10"
              >
                Create account
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 shadow-2xl">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">Today</p>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">Attendance panel</p>
                    <p className="text-sm text-white/60">24 present, 3 on leave</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-600/20 border border-blue-500/40" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/60">Pending approvals</p>
                  <p className="mt-2 text-2xl font-semibold">8</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/60">Next leave</p>
                  <p className="mt-2 text-2xl font-semibold">Apr 12</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">Role permissions</p>
                <p className="mt-2 text-sm text-white/70">
                  Control who can view attendance, manage leaves, and run reports.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Attendance clarity",
              text: "Track present, absent, and leave status in one unified panel.",
            },
            {
              title: "Leave workflows",
              text: "Approve, reject, and report on leave requests with role-based access.",
            },
            {
              title: "Theme controls",
              text: "Customize fonts, palettes, and modes to match your workspace style.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/80"
            >
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-white/70">{item.text}</p>
            </div>
          ))}
        </section>
      </div>

      <SettingsDrawer />
    </div>
  );
}
