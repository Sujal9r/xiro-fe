"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineUserCircle, HiOutlineLogout } from "react-icons/hi";
import apiCall from "../lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  bio?: string;
}

export default function ProfileDropdown({
  showName = true,
  fullWidth = false,
  align = "left",
  placement = "bottom",
}: {
  showName?: boolean;
  fullWidth?: boolean;
  align?: "left" | "right";
  placement?: "top" | "bottom";
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUser();
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUser = async () => {
    try {
      const data = await apiCall("/api/auth/me");
      setUser(data);
    } catch (error) {
    }
  };

  const handleLogout = async () => {
    try {
      await apiCall("/api/auth/logout", { method: "POST" });
    } catch (error) {
    } finally {
      localStorage.removeItem("token");
      router.push("/login");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className="relative rounded-md w-full border"
      style={{
        backgroundColor: "color-mix(in srgb, var(--accent-500) 12%, var(--card))",
        borderColor: "color-mix(in srgb, var(--accent-500) 28%, var(--border))",
      }}
      ref={dropdownRef}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors ${
          fullWidth ? "w-full justify-between" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              {user ? getInitials(user.name) : "U"}
            </div>
          )}
          {showName && (
            <div className="text-left leading-tight">
              <div className="text-gray-800 font-medium">
                {user?.name || "User"}
              </div>
              <div className="text-xs text-gray-500">
                {user?.role || "Member"}
              </div>
            </div>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } ${
            placement === "top" ? "bottom-full mb-2" : "top-full mt-2"
          } ${
            showName ? "w-56" : "w-14"
          } bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50`}
        >
          <button
            onClick={() => {
              setIsOpen(false);
              router.push("/profile");
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors ${
              showName ? "justify-start" : "justify-center"
            }`}
          >
            <HiOutlineUserCircle className="h-5 w-5" />
            {showName && "Profile"}
          </button>
          <hr className="my-1" />
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors ${
              showName ? "justify-start" : "justify-center"
            }`}
          >
            <HiOutlineLogout className="h-5 w-5" />
            {showName && "Logout"}
          </button>
        </div>
      )}
    </div>
  );
}
