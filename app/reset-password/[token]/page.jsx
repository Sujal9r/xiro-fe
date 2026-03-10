"use client";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function ResetPassword() {
  const router = useRouter();
  const pathname = usePathname();

  const token = pathname.split("/").pop(); // ✅ ok if route = /reset-password/[token]

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Passwords match nahi kar rahe 🤦‍♂️");
      return;
    }

    try {
      setLoading(true);
      setIsError(false);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(
        `${API_URL}/api/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setIsError(true);
        setMessage(data.message || "Reset failed ❌");
        return;
      }

      setMessage("Password updated successfully ✅");
      setTimeout(() => router.push("/login"), 1500);

    } catch (err) {
      setIsError(true);
      setMessage("Server issue bhai 😵");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4">

      {/* 🔵 Background */}
      <img 
        src="https://cdn.pixabay.com/photo/2016/11/21/06/53/beautiful-natural-image-1844362_640.jpg"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* 🔳 Glass Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl 
        bg-white/20 backdrop-blur-xl shadow-2xl 
        border border-white/30 px-8 py-10 text-white">

        <h2 className="text-3xl font-bold mb-2 text-center">
          Reset Password 🔒
        </h2>
        <p className="text-white/80 text-center mb-8">
          Enter your new password below
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">

          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-white/80 text-black 
            placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-white/80 text-black 
            placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0a3d91] hover:bg-[#082f6e] 
            transition py-3 rounded-lg font-semibold"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>

          {message && (
            <p className={`text-center text-sm ${
              isError ? "text-red-300" : "text-green-300"
            }`}>
              {message}
            </p>
          )}
        </form>

        <p
          onClick={() => router.push("/login")}
          className="mt-6 text-center text-sm text-white/80 cursor-pointer hover:underline"
        >
          Back to Login
        </p>
      </div>
    </div>
  );
}
