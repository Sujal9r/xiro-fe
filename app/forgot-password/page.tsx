"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const res = await fetch(
      `${API_URL}/api/auth/forgot-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }
    );

    const data = await res.json();
    setMessage(data.message);
  };

  return (
<div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4">
  
  <img
    src="https://cdn.pixabay.com/photo/2016/11/21/06/53/beautiful-natural-image-1844362_640.jpg"
    className="absolute inset-0 w-full h-full object-cover"
  />
 

  {/* 🔳 Glass Card */}
  <div className="relative z-10 w-full max-w-md rounded-2xl 
    bg-white/20 backdrop-blur-xl shadow-2xl 
    border border-white/30 px-8 py-10 text-white">

    <h1 className="text-3xl font-bold mb-2">
      Forgot password?
    </h1>
    <p className="text-white/80 mb-8">
      Enter your email and we’ll send you a reset link
    </p>

    <form onSubmit={handleSubmit} className="space-y-6">
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full px-4 py-3 rounded-lg bg-white/80 text-black 
        placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        type="submit"
        className="w-full bg-[#0a3d91] hover:bg-[#082f6e] 
        transition text-white py-3 rounded-lg text-lg font-semibold"
      >
        Send Reset Link
      </button>
    </form>

    {message && (
      <p className="mt-6 text-sm text-green-300">
        {message}
      </p>
    )}

    <p className="mt-8 text-sm text-white/80">
      Remember your password?{" "}
      <span
        onClick={() => router.push("/login")}
        className="font-semibold cursor-pointer hover:underline"
      >
        Back to Login
      </span>
    </p>
  </div>
</div>

  );
}
