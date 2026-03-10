"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import apiCall from "../../lib/api";
import { PermissionKey } from "../../lib/permissions";

interface User {
  id: string;
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phoneNumber?: string;
  email: string;
  role: string;
  customRole?: { id?: string; _id?: string; name: string; key: string } | null;
  permissions?: PermissionKey[];
  attendanceLogs?: { checkIn: string; checkOut?: string; duration?: number }[];
  avatar?: string;
  bio?: string;
}

const themedSurfaceStyle = {
  backgroundColor: "var(--card)",
  borderColor: "var(--border)",
  color: "var(--foreground)",
};

const themedInputStyle = {
  backgroundColor: "var(--card)",
  borderColor: "var(--border)",
  color: "var(--foreground)",
};

const avatarRingStyle = {
  background:
    "conic-gradient(from 120deg, var(--accent-500), var(--accent-600), var(--accent-700), var(--accent-500))",
  boxShadow: "0 0 0 1px color-mix(in srgb, var(--accent-500) 45%, transparent)",
};

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    firstName: "",
    middleName: "",
    lastName: "",
    phoneNumber: "",
    bio: "",
    avatar: "",
  });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await apiCall("/api/auth/me");
      setUser(data);
      setFormData({
        name: data.name || "",
        firstName: data.firstName || "",
        middleName: data.middleName || "",
        lastName: data.lastName || "",
        phoneNumber: data.phoneNumber || "",
        bio: data.bio || "",
        avatar: data.avatar || "",
      });
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const derivedName = [formData.firstName, formData.middleName, formData.lastName]
        .filter((part) => part && part.trim())
        .join(" ");
      const data = await apiCall("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          name: derivedName || formData.name,
        }),
      });
      setUser(data.user);
      setEditing(false);
      setMessage("Profile updated successfully!");
      setIsError(false);
      setTimeout(() => setMessage(""), 3000);
    } catch (error: any) {
      setMessage(error.message || "Failed to update profile");
      setIsError(true);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  const isSuperadmin = user.role === "superadmin";
  const completionFields = isSuperadmin
    ? [user.name, user.email, user.avatar, user.bio]
    : [
        user.firstName,
        user.lastName,
        user.email,
        user.phoneNumber,
        user.avatar,
        user.bio,
      ];
  const completionPercent = Math.round(
    (completionFields.filter((value) => value && value.toString().trim()).length /
      completionFields.length) *
      100,
  );

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--foreground)" }}>
          Profile
        </h1>

        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="rounded-lg shadow p-6 border" style={themedSurfaceStyle}>
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Profile completion</span>
              <span>{completionPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${completionPercent}%`, backgroundColor: "var(--accent-500)" }}
              />
            </div>
          </div>
          {!editing ? (
            <div className="space-y-6">
              <div className="flex items-center gap-6 text-black">
                <div className="rounded-full p-[3px]" style={avatarRingStyle}>
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-semibold">
                        {getInitials(user.name)}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                  <p className="text-gray-900">{user.email}</p>
                  {!isSuperadmin && (
                    <div className="mt-2 space-y-1 text-sm text-gray-700">
                      <div>
                        {[
                          user.firstName,
                          user.middleName,
                          user.lastName,
                        ]
                          .filter((part) => part && part.trim())
                          .join(" ")}
                      </div>
                      {user.phoneNumber && <div>{user.phoneNumber}</div>}
                    </div>
                  )}
                  <span
                    className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium text-black ${
                      user.role === "admin" || user.role === "superadmin"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.role === "custom"
                      ? user.customRole?.name || "Custom"
                      : user.role}
                  </span>
                </div>
              </div>

              {user.bio && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Bio</h3>
                  <p className="text-gray-900">{user.bio}</p>
                </div>
              )}

              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Edit Profile
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="rounded-full p-[3px]" style={avatarRingStyle}>
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                      {formData.avatar ? (
                        <img
                          src={formData.avatar}
                          alt="Preview"
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-semibold">
                          {getInitials(formData.name)}
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="text-sm text-gray-600"
                  />
                </div>
                <p className="mt-2 text-sm text-black">
                  Or enter image URL:
                </p>
                <input
                  type="url"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="mt-1 block w-full rounded-md border shadow-sm p-2"
                  style={themedInputStyle}
                />
              </div>

              {isSuperadmin ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full rounded-md border shadow-sm p-2"
                    style={themedInputStyle}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      className="block w-full rounded-md border shadow-sm p-2"
                      style={themedInputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={formData.middleName}
                      onChange={(e) =>
                        setFormData({ ...formData, middleName: e.target.value })
                      }
                      className="block w-full rounded-md border shadow-sm p-2"
                      style={themedInputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className="block w-full rounded-md border shadow-sm p-2"
                      style={themedInputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.phoneNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, phoneNumber: e.target.value })
                      }
                      className="block w-full rounded-md border shadow-sm p-2"
                      style={themedInputStyle}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="block w-full rounded-md border shadow-sm p-1"
                  style={themedInputStyle}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    fetchProfile();
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
