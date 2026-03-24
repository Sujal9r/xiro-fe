"use client";

import { useEffect, useState } from "react";
import {
  HiOutlineBriefcase,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineClipboardList,
  HiOutlineDocumentText,
  HiOutlineFolderOpen,
  HiOutlineCurrencyDollar,
  HiOutlineLocationMarker,
  HiOutlineMail,
  HiOutlineOfficeBuilding,
  HiOutlinePencil,
  HiOutlinePhone,
  HiOutlineStar,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from "react-icons/hi";
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
  employeeId?: string;
  createdAt?: string;
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
    "linear-gradient(135deg, var(--accent-700), var(--accent-500), color-mix(in srgb, var(--accent-500) 60%, white))",
};

const infoPillStyle = {
  backgroundColor: "color-mix(in srgb, var(--accent-500) 8%, var(--card))",
  borderColor: "color-mix(in srgb, var(--accent-500) 18%, var(--border))",
};

const tabItems = ["About", "Job", "Time", "Finances", "Docs", "Goals", "Reviews", "Onboarding"] as const;
type ProfileTab = (typeof tabItems)[number];

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
  const [activeTab, setActiveTab] = useState<ProfileTab>("About");

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
      setMessage("Profile updated successfully.");
      setIsError(false);
      setTimeout(() => setMessage(""), 3000);
    } catch (error: any) {
      setMessage(error.message || "Failed to update profile");
      setIsError(true);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((current) => ({ ...current, avatar: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatDate = (value?: string) => {
    if (!value) return "Not available";
    return new Date(value).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  const isSuperadmin = user.role === "superadmin";
  const fullName =
    [
      user.firstName,
      user.middleName,
      user.lastName,
    ]
      .filter((part) => part && part.trim())
      .join(" ") || user.name;
  const designation = user.role === "custom" ? user.customRole?.name || "Custom Role" : user.role;
  const completionFields = isSuperadmin
    ? [user.name, user.email, user.avatar, user.bio]
    : [user.firstName, user.lastName, user.email, user.phoneNumber, user.avatar, user.bio];
  const completionPercent = Math.round(
    (completionFields.filter((value) => value && value.toString().trim()).length /
      completionFields.length) *
      100,
  );
  const attendanceCount = user.attendanceLogs?.length || 0;
  const recentAttendance = user.attendanceLogs?.slice(0, 3) || [];
  const locationLabel = user.role === "superadmin" ? "Head Office" : "Hyderabad, India";
  const timelineItems = [
    {
      icon: HiOutlineBriefcase,
      title: `${designation} profile activated`,
      subtitle: formatDate(user.createdAt),
      tone: "bg-sky-100 text-sky-600",
    },
    {
      icon: HiOutlineSparkles,
      title: "Profile completion updated",
      subtitle: `${completionPercent}% completed`,
      tone: "bg-amber-100 text-amber-600",
    },
    {
      icon: HiOutlineClock,
      title: "Attendance records tracked",
      subtitle: `${attendanceCount} entries available`,
      tone: "bg-emerald-100 text-emerald-600",
    },
  ];
  const praiseItems = [
    { label: "Team Spirit", count: Math.max(1, Math.ceil(completionPercent / 25)), tone: "bg-pink-100 text-pink-600" },
    { label: "Reliability", count: Math.max(1, Math.ceil(attendanceCount / 5) || 1), tone: "bg-green-100 text-green-600" },
    { label: "Ownership", count: 1, tone: "bg-blue-100 text-blue-600" },
    { label: "Consistency", count: Math.max(1, Math.ceil(completionPercent / 30)), tone: "bg-amber-100 text-amber-600" },
  ];
  const onboardingItems = [
    { label: "Profile details completed", done: completionPercent >= 70 },
    { label: "Avatar uploaded", done: Boolean(user.avatar) },
    { label: "Phone number added", done: Boolean(user.phoneNumber) },
    { label: "Attendance started", done: attendanceCount > 0 },
  ];
  const financeItems = [
    { label: "Payroll Status", value: "Active" },
    { label: "Payment Cycle", value: "Monthly" },
    { label: "Tax Profile", value: "Standard" },
    { label: "Employee ID", value: user.employeeId || "Pending" },
  ];
  const documentItems = [
    { label: "Profile Document", value: completionPercent >= 80 ? "Verified" : "Pending review" },
    { label: "Contact Record", value: user.phoneNumber ? "Available" : "Missing" },
    { label: "Role Assignment", value: designation },
    { label: "Account Status", value: "Active" },
  ];
  const reviewItems = [
    { title: "Collaboration", value: "Strong team coordination and dependable follow-through." },
    { title: "Communication", value: user.bio ? "Clear written profile and active personal context." : "Add more profile context to improve visibility." },
    { title: "Reliability", value: attendanceCount >= 5 ? "Attendance trail indicates consistent participation." : "Attendance history is still building." },
  ];
  const timeSummary = [
    { label: "Attendance Entries", value: `${attendanceCount}` },
    { label: "Last Activity", value: recentAttendance[0]?.checkIn ? formatDate(recentAttendance[0].checkIn) : "No activity yet" },
    { label: "Total Tracked", value: `${recentAttendance.reduce((sum, item) => sum + (item.duration || 0), 0)} mins` },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-4">
        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              isError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {message}
          </div>
        )}

        <section className="overflow-hidden rounded-[24px] border shadow-sm" style={themedSurfaceStyle}>
          <div className="grid lg:grid-cols-[180px_minmax(0,1fr)]">
            <div
              className="flex min-h-[180px] items-center justify-center p-4"
              style={{
                background:
                  "linear-gradient(145deg, color-mix(in srgb, var(--accent-500) 18%, white), color-mix(in srgb, var(--accent-700) 12%, var(--card)))",
              }}
            >
              <div className="rounded-[20px] p-1" style={avatarRingStyle}>
                <div className="h-[148px] w-[148px] overflow-hidden rounded-[16px] bg-white">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-blue-600 text-4xl font-semibold text-white">
                      {getInitials(user.name)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
                        {fullName}
                      </h1>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                        <InfoInline icon={HiOutlineLocationMarker} text={locationLabel} />
                        <InfoInline icon={HiOutlineMail} text={user.email} />
                        <InfoInline icon={HiOutlinePhone} text={user.phoneNumber || "Phone not added"} />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditing((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <HiOutlinePencil className="h-4 w-4" />
                    {editing ? "Close Editor" : "Edit Profile"}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 border-b px-5 py-4 sm:grid-cols-2 xl:grid-cols-5" style={{ borderColor: "var(--border)" }}>
                <MetaStat label="Designation" value={designation} />
                <MetaStat label="Department" value="Operations" />
                <MetaStat label="Reporting To" value={isSuperadmin ? "Board / Owner" : "Team Lead"} />
                <MetaStat label="Employee No" value={user.employeeId || "Pending"} />
                <MetaStat label="Profile Score" value={`${completionPercent}%`} accent />
              </div>

              <div className="flex flex-wrap gap-5 px-5 py-3 text-sm text-gray-500">
                {tabItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setActiveTab(item)}
                    className={`relative pb-1 transition ${
                      activeTab === item ? "font-semibold text-blue-600" : "hover:text-gray-700"
                    }`}
                  >
                    {item}
                    {activeTab === item ? (
                      <span className="absolute bottom-[-12px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-blue-500" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {activeTab === "About" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <ProfileCard title="About">
                <div className="space-y-4 text-sm leading-6 text-gray-600">
                  <p>
                    {user.bio ||
                      "A focused team member building reliable workflows, maintaining clear communication, and contributing consistently across day-to-day operations."}
                  </p>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">What drives this role?</h3>
                    <p className="mt-1.5">
                      {isSuperadmin
                        ? "Leading the platform direction, keeping teams aligned, and ensuring every operational workflow remains dependable."
                        : "Delivering dependable work, improving collaboration, and keeping execution quality high across daily responsibilities."}
                    </p>
                  </div>
                </div>
              </ProfileCard>

              <ProfileCard title="Timeline">
                <div className="space-y-5">
                  {timelineItems.map((item, index) => (
                    <div key={item.title} className="relative flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${item.tone}`}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        {index < timelineItems.length - 1 ? (
                          <div className="mt-2 h-full w-px border-l border-dashed border-gray-300" />
                        ) : null}
                      </div>
                      <div className="pb-2">
                        <p className="text-base font-medium text-gray-900">{item.title}</p>
                        <p className="mt-1 text-sm text-gray-500">{item.subtitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ProfileCard>

              {editing ? (
                <ProfileCard title="Edit Profile">
                  <form onSubmit={handleUpdate} className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Profile Photo</label>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="rounded-[16px] p-1" style={avatarRingStyle}>
                          <div className="h-20 w-20 overflow-hidden rounded-[12px] bg-gray-100">
                            {formData.avatar ? (
                              <img src={formData.avatar} alt="Preview" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-blue-600 text-xl font-semibold text-white">
                                {getInitials(formData.name || fullName)}
                              </div>
                            )}
                          </div>
                        </div>
                        <input type="file" accept="image/*" onChange={handleAvatarChange} className="text-sm text-gray-600" />
                      </div>
                      <input
                        type="url"
                        value={formData.avatar}
                        onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                        placeholder="https://example.com/avatar.jpg"
                        className="mt-3 block w-full rounded-lg border p-2.5 shadow-sm"
                        style={themedInputStyle}
                      />
                    </div>

                    {isSuperadmin ? (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Name</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="block w-full rounded-lg border p-2.5 shadow-sm"
                          style={themedInputStyle}
                        />
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="First Name">
                          <input
                            type="text"
                            required
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="block w-full rounded-lg border p-2.5 shadow-sm"
                            style={themedInputStyle}
                          />
                        </Field>
                        <Field label="Middle Name">
                          <input
                            type="text"
                            value={formData.middleName}
                            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                            className="block w-full rounded-lg border p-2.5 shadow-sm"
                            style={themedInputStyle}
                          />
                        </Field>
                        <Field label="Last Name">
                          <input
                            type="text"
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="block w-full rounded-lg border p-2.5 shadow-sm"
                            style={themedInputStyle}
                          />
                        </Field>
                        <Field label="Phone Number">
                          <input
                            type="text"
                            required
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            className="block w-full rounded-lg border p-2.5 shadow-sm"
                            style={themedInputStyle}
                          />
                        </Field>
                      </div>
                    )}

                    <Field label="About">
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        rows={5}
                        className="block w-full rounded-lg border p-2.5 shadow-sm"
                        style={themedInputStyle}
                        placeholder="Tell us about yourself..."
                      />
                    </Field>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false);
                          fetchProfile();
                        }}
                        className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </ProfileCard>
              ) : null}
            </div>

            <div className="space-y-4">
              <ProfileCard title="Quick Info">
                <div className="grid gap-2.5">
                  <QuickInfo icon={HiOutlineOfficeBuilding} label="Department" value="Operations" />
                  <QuickInfo icon={HiOutlineBriefcase} label="Role" value={designation} />
                  <QuickInfo icon={HiOutlineCalendar} label="Joined" value={formatDate(user.createdAt)} />
                  <QuickInfo icon={HiOutlineUserGroup} label="Employee ID" value={user.employeeId || "Pending"} />
                </div>
              </ProfileCard>

              <ProfileCard title="Contact Summary">
                <div className="grid gap-3 sm:grid-cols-2">
                  <MiniStat label="Email" value={user.email} />
                  <MiniStat label="Phone" value={user.phoneNumber || "Not added"} />
                  <MiniStat label="Location" value={locationLabel} />
                  <MiniStat label="Profile Score" value={`${completionPercent}%`} />
                </div>
              </ProfileCard>
            </div>
          </div>
        ) : null}

        {activeTab === "Job" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <ProfileCard title="Role Overview">
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniStat label="Designation" value={designation} />
                <MiniStat label="Department" value="Operations" />
                <MiniStat label="Reporting To" value={isSuperadmin ? "Board / Owner" : "Team Lead"} />
                <MiniStat label="Employee No" value={user.employeeId || "Pending"} />
              </div>
            </ProfileCard>
            <ProfileCard title={`Reporting Team (${Math.max(3, Math.min(6, attendanceCount || 3))})`}>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { name: "Victor Pacheco", role: "Senior Engineer" },
                  { name: "Angela Longoria", role: "Full Stack Developer" },
                  { name: "Tikhon Yaroslavsky", role: "Web Developer" },
                ].map((member, index) => (
                  <div key={member.name} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                      {member.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">
                        {index === 0 && isSuperadmin ? "Operations Lead" : member.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ProfileCard>
          </div>
        ) : null}

        {activeTab === "Time" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <ProfileCard title="Time Summary">
              <div className="grid gap-3 sm:grid-cols-3">
                {timeSummary.map((item) => (
                  <MiniStat key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </ProfileCard>
            <ProfileCard title="Recent Attendance">
              {recentAttendance.length ? (
                <div className="space-y-3">
                  {recentAttendance.map((log, index) => (
                    <div key={`${log.checkIn}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatDate(log.checkIn)}</p>
                        <p className="text-sm text-gray-500">
                          Check-in: {new Date(log.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>{log.checkOut ? "Completed" : "Open"}</p>
                        <p>{log.duration || 0} mins</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={HiOutlineClock} title="No attendance records yet" description="Time tracking will appear here once the first attendance entry is recorded." />
              )}
            </ProfileCard>
          </div>
        ) : null}

        {activeTab === "Finances" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <ProfileCard title="Finance Summary">
              <div className="grid gap-3 sm:grid-cols-2">
                {financeItems.map((item) => (
                  <QuickInfo key={item.label} icon={HiOutlineCurrencyDollar} label={item.label} value={item.value} />
                ))}
              </div>
            </ProfileCard>
            <ProfileCard title="Finance Notes">
              <div className="space-y-3 text-sm leading-6 text-gray-600">
                <p>Personal finance details are managed centrally and exposed here as a quick employee snapshot.</p>
                <p>Use the finance modules for salary structures, payment adjustments, and reimbursement workflows.</p>
              </div>
            </ProfileCard>
          </div>
        ) : null}

        {activeTab === "Docs" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <ProfileCard title="Document Status">
              <div className="grid gap-3">
                {documentItems.map((item) => (
                  <QuickInfo key={item.label} icon={HiOutlineDocumentText} label={item.label} value={item.value} />
                ))}
              </div>
            </ProfileCard>
            <ProfileCard title="Workspace Files">
              <EmptyState
                icon={HiOutlineFolderOpen}
                title="No linked documents"
                description="Attach policies, identity proofs, or onboarding files here when document workflows are added."
              />
            </ProfileCard>
          </div>
        ) : null}

        {activeTab === "Goals" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <ProfileCard title="Goals">
              <div className="space-y-4">
                <GoalRow
                  title="Complete profile and personal details"
                  progress={completionPercent}
                  status={completionPercent >= 80 ? "On track" : "Needs attention"}
                />
                <GoalRow
                  title="Maintain steady attendance records"
                  progress={Math.min(100, attendanceCount * 12)}
                  status={attendanceCount >= 5 ? "On track" : "Building"}
                />
              </div>
            </ProfileCard>
            <ProfileCard title="Priority Focus">
              <div className="space-y-3">
                <StatusRow label="Profile quality" value={`${completionPercent}%`} />
                <StatusRow label="Attendance readiness" value={attendanceCount > 0 ? "Active" : "Pending"} />
                <StatusRow label="Contact completeness" value={user.phoneNumber ? "Complete" : "Add phone"} />
              </div>
            </ProfileCard>
          </div>
        ) : null}

        {activeTab === "Reviews" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <ProfileCard title="Praise">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {praiseItems.map((item) => (
                  <div key={item.label} className="text-center">
                    <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${item.tone}`}>
                      <HiOutlineSparkles className="h-5 w-5" />
                    </div>
                    <div className="mt-2 text-xs font-semibold text-gray-500">{item.count}</div>
                    <p className="mt-1 text-sm font-medium text-gray-900">{item.label}</p>
                  </div>
                ))}
              </div>
            </ProfileCard>
            <ProfileCard title="Review Notes">
              <div className="space-y-3">
                {reviewItems.map((item) => (
                  <div key={item.title} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.value}</p>
                  </div>
                ))}
              </div>
            </ProfileCard>
          </div>
        ) : null}

        {activeTab === "Onboarding" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <ProfileCard title="Onboarding Checklist">
              <div className="space-y-3">
                {onboardingItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <HiOutlineCheckCircle className={`h-5 w-5 ${item.done ? "text-emerald-500" : "text-gray-300"}`} />
                      <span className="text-sm font-medium text-gray-900">{item.label}</span>
                    </div>
                    <span className={`text-xs font-semibold ${item.done ? "text-emerald-600" : "text-amber-600"}`}>
                      {item.done ? "Done" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </ProfileCard>
            <ProfileCard title="Next Steps">
              <div className="space-y-3">
                <QuickInfo icon={HiOutlineClipboardList} label="Primary Action" value={editing ? "Finish profile edits" : "Review profile details"} />
                <QuickInfo icon={HiOutlineStar} label="Completion" value={`${completionPercent}%`} />
                <QuickInfo icon={HiOutlineClock} label="Attendance Setup" value={attendanceCount > 0 ? "Started" : "Awaiting first record"} />
              </div>
            </ProfileCard>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

function ProfileCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[20px] border p-5 shadow-sm" style={themedSurfaceStyle}>
      <h2 className="text-xl font-medium text-gray-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetaStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">{label}</p>
      <p className={`mt-1.5 text-base font-medium ${accent ? "text-blue-600" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function InfoInline({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5" style={infoPillStyle}>
      <Icon className="h-3.5 w-3.5 text-gray-400" />
      <span>{text}</span>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function GoalRow({
  title,
  progress,
  status,
}: {
  title: string;
  progress: number;
  status: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-500">{status}</p>
        </div>
        <div className="text-sm font-semibold text-blue-600">{progress}%</div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function QuickInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">{label}</p>
      <p className="mt-1.5 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">{description}</p>
    </div>
  );
}
