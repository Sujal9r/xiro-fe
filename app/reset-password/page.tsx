"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import apiCall from "../../lib/api";
import { useRouter } from "next/navigation";

export default function ResetPassword() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage("New passwords do not match");
      setIsError(true);
      return;
    }

    if (formData.newPassword.length < 6) {
      setMessage("Password must be at least 6 characters");
      setIsError(true);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await apiCall("/api/auth/update-password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      setMessage("Password updated successfully!");
      setIsError(false);
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTimeout(() => router.push("/profile"), 2000);
    } catch (error: any) {
      setMessage(error.message || "Failed to update password");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Reset Password</h1>

        <div className="bg-white rounded-lg shadow p-6">
          {message && (
            <div
              className={`mb-4 p-4 rounded-lg ${
                isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPassword.current ? "text" : "password"}
                  required
                  value={formData.currentPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, currentPassword: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword({ ...showPassword, current: !showPassword.current })
                  }
                  className="absolute right-3 top-2 text-gray-600"
                >
                  {showPassword.current ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword.new ? "text" : "password"}
                  required
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword({ ...showPassword, new: !showPassword.new })
                  }
                  className="absolute right-3 top-2 text-gray-600"
                >
                  {showPassword.new ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword.confirm ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword({ ...showPassword, confirm: !showPassword.confirm })
                  }
                  className="absolute right-3 top-2 text-gray-600"
                >
                  {showPassword.confirm ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
