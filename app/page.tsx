"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import SettingsDrawer from "../components/SettingsDrawer";

export default function Home() {
  const router = useRouter();
  const highlights = [
    "Live attendance insights",
    "Approvals without clutter",
    "Role-based control",
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),transparent_45%)]" />
      <div className="animate-xiro-glow absolute -top-40 left-[-10%] h-[420px] w-[420px] rounded-full bg-blue-600/30 blur-[140px]" />
      <div className="animate-xiro-glow absolute bottom-0 right-0 h-[460px] w-[460px] rounded-full bg-blue-400/20 blur-[160px]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
        <header className="animate-xiro-fade-up flex flex-col gap-5 sm:gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-xl font-semibold sm:text-2xl">
            <Image
              src="/xiro.png"
              alt="Xiro logo"
              width={44}
              height={44}
              className="h-10 w-10 rounded-2xl bg-white/95 object-cover p-1 sm:h-11 sm:w-11"
            />
            Xiro
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <button
              onClick={() => router.push("/login")}
              className="rounded-full border border-white/30 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 sm:px-5 sm:py-2"
            >
              Log in
            </button>
            <button
              onClick={() => router.push("/signup")}
              className="rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:px-5 sm:py-2"
            >
              Get started
            </button>
          </div>
        </header>

        <section className="mt-10 grid gap-8 sm:mt-14 sm:gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="animate-xiro-fade-up space-y-6" style={{ animationDelay: "120ms" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50 sm:text-sm sm:tracking-[0.2em]">
              Workforce Operations
            </p>
            <h1 className="max-w-3xl text-[2.35rem] font-semibold leading-[1.05] sm:text-5xl sm:leading-tight lg:text-6xl">
              A modern workspace for attendance, leaves, and team approvals.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
              Keep your team in sync with real-time attendance panels, leave workflows, and
              permission-based access across every role.
            </p>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="rounded-full border border-white/15 bg-white/8 px-3.5 py-2 text-xs text-white/80 backdrop-blur sm:px-4 sm:text-sm"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:flex sm:flex-wrap sm:gap-4">
              <button
                onClick={() => router.push("/login")}
                className="w-full rounded-2xl bg-white px-6 py-3 font-semibold text-gray-900 shadow-[0_18px_40px_rgba(255,255,255,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-gray-100 sm:w-auto"
              >
                Sign in
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="w-full rounded-2xl border border-white/30 px-6 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/10 sm:w-auto"
              >
                Create account
              </button>
            </div>
          </div>

          <div
            className="animate-xiro-fade-up overflow-hidden rounded-[28px] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-xl sm:rounded-[32px] sm:p-6"
            style={{ animationDelay: "220ms" }}
          >
            <div className="relative rounded-[24px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.14),rgba(255,255,255,0.03))] px-4 py-6 sm:rounded-[28px] sm:px-6 sm:py-8">
              <div className="animate-xiro-glow absolute inset-x-8 top-3 h-20 rounded-full bg-blue-500/20 blur-3xl sm:inset-x-10 sm:top-4 sm:h-24" />
              <div className="absolute -right-6 top-8 h-16 w-16 rounded-full border border-white/10 bg-white/8 backdrop-blur sm:-right-8 sm:top-10 sm:h-24 sm:w-24" />
              <div className="absolute -left-4 bottom-6 h-12 w-12 rounded-full border border-white/10 bg-white/8 backdrop-blur sm:-left-5 sm:bottom-8 sm:h-16 sm:w-16" />
              <div className="relative flex flex-col items-center text-center">
                <div className="animate-xiro-float rounded-[26px] border border-white/15 bg-white/95 p-2.5 shadow-[0_24px_60px_rgba(15,23,42,0.28)] sm:rounded-[30px] sm:p-3">
                  <Image
                    src="/xiro.png"
                    alt="Xiro"
                    width={220}
                    height={220}
                    className="h-28 w-28 object-contain sm:h-40 sm:w-40 lg:h-48 lg:w-48"
                    priority
                  />
                </div>
                <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/75 sm:mt-6 sm:text-[11px]">
                  Smart HR Workspace
                </div>
                <h2 className="mt-4 text-xl font-semibold text-white sm:mt-5 sm:text-2xl lg:text-3xl">
                  Xiro keeps your people operations simple and sharp.
                </h2>
                <p className="mt-3 max-w-md px-2 text-sm leading-6 text-white/70 sm:px-0">
                  Attendance, approvals, leaves, assets, and role control in one clean workspace.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>

      <SettingsDrawer />
    </div>
  );
}
