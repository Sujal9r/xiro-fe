"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import apiCall from "../../../lib/api";
import { useAlert } from "../../../components/AlertProvider";
import { PERMISSIONS, PermissionKey } from "../../../lib/permissions";

interface UserShift {
  _id: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string;
  customRole?: { name?: string } | null;
  shift?: {
    startTime?: string;
    endTime?: string;
  };
}

const DEFAULT_SHIFT_START = "10:00";
const DEFAULT_SHIFT_END = "19:00";
const SHIFT_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TWELVE_HOUR_TIME_PATTERN = /^(0[1-9]|1[0-2]):([0-5]\d)$/;

const resolveRoleLabel = (user: UserShift) =>
  user.role === "custom" ? user.customRole?.name || "Custom" : user.role;

const resolveShift = (user: UserShift) => ({
  startTime: user.shift?.startTime || DEFAULT_SHIFT_START,
  endTime: user.shift?.endTime || DEFAULT_SHIFT_END,
});

const to12HourParts = (time: string): { clock: string; period: "AM" | "PM" } => {
  if (!SHIFT_TIME_PATTERN.test(time)) return { clock: "12:00", period: "AM" };
  const [hours, minutes] = time.split(":").map(Number);
  const period = (hours >= 12 ? "PM" : "AM") as "AM" | "PM";
  const normalizedHour = hours % 12 || 12;
  return {
    clock: `${String(normalizedHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    period,
  };
};

const to24Hour = (clock: string, period: "AM" | "PM") => {
  if (!TWELVE_HOUR_TIME_PATTERN.test(clock)) return null;
  const [hourPart, minutePart] = clock.split(":").map(Number);
  let hours = hourPart;
  if (period === "AM") {
    if (hours === 12) hours = 0;
  } else if (hours !== 12) {
    hours += 12;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutePart).padStart(2, "0")}`;
};

const format12Hour = (time: string) => {
  const parts = to12HourParts(time);
  return `${parts.clock} ${parts.period}`;
};

export default function ShiftManagementPage() {
  const [users, setUsers] = useState<UserShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [startClock, setStartClock] = useState("10:00");
  const [startPeriod, setStartPeriod] = useState<"AM" | "PM">("AM");
  const [endClock, setEndClock] = useState("07:00");
  const [endPeriod, setEndPeriod] = useState<"AM" | "PM">("PM");
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const { showAlert } = useAlert();

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const [data, me] = await Promise.all([
        apiCall("/api/admin/shifts"),
        apiCall("/api/auth/me"),
      ]);
      const list = Array.isArray(data) ? data : [];
      setPermissions((me.permissions || []) as PermissionKey[]);
      setUsers(list);
      if (list.length && !selectedUserId) {
        const first = list[0] as UserShift;
        const shift = resolveShift(first);
        setSelectedUserId(first._id);
        const start = to12HourParts(shift.startTime);
        const end = to12HourParts(shift.endTime);
        setStartClock(start.clock);
        setStartPeriod(start.period);
        setEndClock(end.clock);
        setEndPeriod(end.period);
      }
    } catch (error) {
      showAlert(getErrorMessage(error, "Failed to fetch shifts"));
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, showAlert]);

  const canManageShift =
    permissions.includes(PERMISSIONS.MANAGE_SHIFT_MANAGEMENT) ||
    permissions.includes(PERMISSIONS.MANAGE_USERS) ||
    permissions.includes(PERMISSIONS.EDIT_EMPLOYEE);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.employeeId || "").toLowerCase().includes(q) ||
        resolveRoleLabel(user).toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  const selectedUser = useMemo(
    () => users.find((user) => user._id === selectedUserId) || null,
    [users, selectedUserId],
  );

  const onSelectEmployee = (userId: string) => {
    setSelectedUserId(userId);
    const user = users.find((item) => item._id === userId);
    if (!user) return;
    const shift = resolveShift(user);
    const start = to12HourParts(shift.startTime);
    const end = to12HourParts(shift.endTime);
    setStartClock(start.clock);
    setStartPeriod(start.period);
    setEndClock(end.clock);
    setEndPeriod(end.period);
  };

  const handleApplyShift = async () => {
    if (!selectedUserId) {
      showAlert("Please select an employee");
      return;
    }
    if (!startClock || !endClock) {
      showAlert("Please select both shift times");
      return;
    }
    if (!TWELVE_HOUR_TIME_PATTERN.test(startClock) || !TWELVE_HOUR_TIME_PATTERN.test(endClock)) {
      showAlert("Use 12-hour format: hh:mm with AM/PM");
      return;
    }
    const startTime = to24Hour(startClock, startPeriod);
    const endTime = to24Hour(endClock, endPeriod);
    if (!startTime || !endTime) {
      showAlert("Invalid time format");
      return;
    }
    setSaving(true);
    try {
      await apiCall(`/api/admin/shifts/${selectedUserId}`, {
        method: "PUT",
        body: JSON.stringify({ startTime, endTime }),
      });
      showAlert("Shift updated successfully");
      await fetchShifts();
    } catch (error) {
      showAlert(getErrorMessage(error, "Failed to update shift"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Assign shift start and end times per employee for clock-in and clock-out.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Apply Shift</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Employee</label>
              <select
                value={selectedUserId}
                onChange={(e) => onSelectEmployee(e.target.value)}
                className="w-full rounded-md border border-gray-200 p-2 text-black"
              >
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.employeeId || "No ID"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Shift Start</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="hh:mm"
                  value={startClock}
                  onChange={(e) => setStartClock(e.target.value)}
                  className="w-full rounded-md border border-gray-200 p-2 text-black"
                />
                <select
                  value={startPeriod}
                  onChange={(e) => setStartPeriod(e.target.value as "AM" | "PM")}
                  className="w-24 rounded-md border border-gray-200 p-2 text-black"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              <p className="mt-1 text-xs text-gray-500">12-hour format (hh:mm AM/PM)</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Shift End</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="hh:mm"
                  value={endClock}
                  onChange={(e) => setEndClock(e.target.value)}
                  className="w-full rounded-md border border-gray-200 p-2 text-black"
                />
                <select
                  value={endPeriod}
                  onChange={(e) => setEndPeriod(e.target.value as "AM" | "PM")}
                  className="w-24 rounded-md border border-gray-200 p-2 text-black"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              <p className="mt-1 text-xs text-gray-500">12-hour format (hh:mm AM/PM)</p>
            </div>
          </div>
          {selectedUser && (
            <p className="text-xs text-gray-500">
              Current: {selectedUser.name} ({resolveRoleLabel(selectedUser)}) •{" "}
              {format12Hour(resolveShift(selectedUser).startTime)} -{" "}
              {format12Hour(resolveShift(selectedUser).endTime)}
            </p>
          )}
          <div>
            <button
              onClick={handleApplyShift}
              disabled={saving || !canManageShift}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : canManageShift ? "Apply Shift" : "Read Only"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee by name, email, role, or ID"
              className="w-full md:w-96 rounded-md border border-gray-200 p-2 text-black"
            />
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Shift Start
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Shift End
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const shift = resolveShift(user);
                  return (
                    <tr
                      key={user._id}
                      className={`cursor-pointer ${
                        selectedUserId === user._id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => onSelectEmployee(user._id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.employeeId || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {resolveRoleLabel(user)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format12Hour(shift.startTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format12Hour(shift.endTime)}
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
