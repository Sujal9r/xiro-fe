"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import LeaveGridCalendar, {
  LeaveGridRequest,
} from "../../components/LeaveGridCalendar";
import apiCall from "../../lib/api";
import { PERMISSIONS, PermissionKey } from "../../lib/permissions";

interface AttendanceLog {
  checkIn: string;
  checkOut?: string;
  duration?: number;
}

interface LeaveInfo {
  typeName: string;
  halfDay?: boolean;
  leaveUnit?: "full_day" | "half_day" | "partial_day";
  halfDaySession?: "first_half" | "second_half" | "";
  partialMinutes?: number;
  partialDayPosition?: "start" | "end" | "";
  fromDate?: string;
  toDate?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  employeeId?: string;
  attendanceLogs: AttendanceLog[];
  leave?: LeaveInfo | null;
}

export default function AttendancePanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingRequests, setPendingRequests] = useState<LeaveGridRequest[]>([]);
  const [calendarLeaves, setCalendarLeaves] = useState<LeaveGridRequest[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    fetchAttendance();
  }, []);

  useEffect(() => {
    if (permissions.length > 0) {
      fetchLeaveRequests();
      fetchCalendar();
    }
  }, [permissions, calendarMonth]);

  const fetchAttendance = async () => {
    try {
      const [data, me] = await Promise.all([
        apiCall("/api/attendance/panel"),
        apiCall("/api/auth/me"),
      ]);
      setUsers(data);
      setPermissions((me.permissions || []) as PermissionKey[]);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    if (!permissions.includes(PERMISSIONS.LEAVE_REQUESTS_VIEW)) return;
    try {
      const data = await apiCall("/api/leaves/requests?status=pending");
      setPendingRequests(data);
    } catch (error) {
    }
  };

  const fetchCalendar = async () => {
    if (!permissions.includes(PERMISSIONS.LEAVE_CALENDAR_VIEW)) return;
    const [year, month] = calendarMonth.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const fromDate = start.toISOString().slice(0, 10);
    const toDate = end.toISOString().slice(0, 10);
    try {
      const data = await apiCall(
        `/api/leaves/calendar?status=approved&fromDate=${fromDate}&toDate=${toDate}`,
      );
      setCalendarLeaves(data);
    } catch (error) {
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const getTodayLog = (user: User) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return user.attendanceLogs.find((log) => {
      const checkInDate = new Date(log.checkIn);
      return checkInDate >= start && checkInDate <= end;
    });
  };

  const getStatus = (user: User) => {
    if (user.leave) {
      const leaveUnit = user.leave.leaveUnit || (user.leave.halfDay ? "half_day" : "full_day");
      if (leaveUnit === "partial_day") return "Partial Leave";
      if (leaveUnit === "half_day") return "Half Day";
      return "On Leave";
    }
    const todayLog = getTodayLog(user);
    if (!todayLog) return "Not In Yet";
    if (todayLog.checkIn && !todayLog.checkOut) return "Present";
    if (todayLog.checkIn && todayLog.checkOut) return "Checked Out";
    return "Not In Yet";
  };

  const attendancePercent = (user: User) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recent = user.attendanceLogs.filter((log) => new Date(log.checkIn) >= cutoff);
    return Math.min(100, Math.round((recent.length / 30) * 100));
  };

  const filteredUsers = users.filter((user) => {
    const matchesText =
      user.name.toLowerCase().includes(filter.toLowerCase()) ||
      user.email.toLowerCase().includes(filter.toLowerCase()) ||
      (user.employeeId || "").toLowerCase().includes(filter.toLowerCase());
    if (!matchesText) return false;
    if (statusFilter === "all") return true;
    return getStatus(user).toLowerCase().replace(/\s+/g, "_") === statusFilter;
  });

  const totals = useMemo(() => {
    const total = filteredUsers.length;
    const present = filteredUsers.filter((u) => getStatus(u) === "Present").length;
    const absent = filteredUsers.filter((u) => getStatus(u) === "Not In Yet").length;
    const checkedOut = filteredUsers.filter((u) => getStatus(u) === "Checked Out").length;
    const onLeave = filteredUsers.filter((u) => getStatus(u) === "On Leave").length;
    const halfDay = filteredUsers.filter((u) => getStatus(u) === "Half Day").length;
    const partialLeave = filteredUsers.filter((u) => getStatus(u) === "Partial Leave").length;
    return { total, present, absent, checkedOut, onLeave, halfDay, partialLeave };
  }, [filteredUsers]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  const canViewPanel =
    permissions.includes(PERMISSIONS.ATTENDANCE_PANEL_VIEW) ||
    permissions.includes(PERMISSIONS.VIEW_ADMIN_ATTENDANCE);
  const canViewClocks = permissions.includes(PERMISSIONS.ATTENDANCE_VIEW_CLOCKS);
  const canViewPercent = permissions.includes(PERMISSIONS.ATTENDANCE_VIEW_PERCENT);
  const canViewNotes = permissions.includes(PERMISSIONS.ATTENDANCE_VIEW_NOTES);
  const canViewRequests = permissions.includes(PERMISSIONS.LEAVE_REQUESTS_VIEW);
  const canViewCalendar = permissions.includes(PERMISSIONS.LEAVE_CALENDAR_VIEW);

  if (!canViewPanel) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          You do not have permission to view attendance.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attendance Panel</h1>
            <p className="text-sm text-gray-500">
              Track presence, check-ins, leaves, and attendance percentage.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <div className="bg-white rounded-lg shadow p-3 text-center">
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-xl font-semibold text-gray-900">{totals.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-3 text-center">
              <div className="text-xs text-gray-500">Present</div>
              <div className="text-xl font-semibold text-green-600">
                {totals.present}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-3 text-center">
              <div className="text-xs text-gray-500">Not In Yet</div>
              <div className="text-xl font-semibold text-red-600">{totals.absent}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-3 text-center">
              <div className="text-xs text-gray-500">Checked Out</div>
              <div className="text-xl font-semibold text-amber-600">{totals.checkedOut}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-3 text-center">
              <div className="text-xs text-gray-500">On Leave</div>
              <div className="text-xl font-semibold text-blue-600">
                {totals.onLeave}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-3 text-center">
              <div className="text-xs text-gray-500">Half Day</div>
              <div className="text-xl font-semibold text-orange-600">
                {totals.halfDay}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-3 text-center">
              <div className="text-xs text-gray-500">Partial Leave</div>
              <div className="text-xl font-semibold text-indigo-600">
                {totals.partialLeave}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            placeholder="Search by name, email, or ID"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full md:w-1/2 rounded-md border border-gray-200 p-2 text-black"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-56 rounded-md border border-gray-200 p-2 text-black"
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="not_in_yet">Not In Yet</option>
            <option value="checked_out">Checked Out</option>
            <option value="on_leave">On Leave</option>
            <option value="half_day">Half Day</option>
            <option value="partial_leave">Partial Leave</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Participant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  {canViewClocks && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Check In
                    </th>
                  )}
                  {canViewClocks && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Check Out
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  {canViewPercent && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Attendance %
                    </th>
                  )}
                  {canViewNotes && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Notes
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const log = getTodayLog(user);
                  const status = getStatus(user);
                  return (
                    <tr key={user._id}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.name}
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.employeeId || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            status === "Present"
                              ? "bg-green-100 text-green-700"
                              : status === "Checked Out"
                              ? "bg-amber-100 text-amber-700"
                              : status === "On Leave"
                              ? "bg-blue-100 text-blue-700"
                              : status === "Half Day"
                              ? "bg-orange-100 text-orange-700"
                              : status === "Partial Leave"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      {canViewClocks && (
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {log?.checkIn ? formatTime(log.checkIn) : "-"}
                        </td>
                      )}
                      {canViewClocks && (
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {log?.checkOut ? formatTime(log.checkOut) : "-"}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log?.checkIn ? formatDate(log.checkIn) : "-"}
                      </td>
                      {canViewPercent && (
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {attendancePercent(user)}%
                        </td>
                      )}
                      {canViewNotes && (
                        <td className="px-6 py-4 text-sm text-gray-500">-</td>
                      )}
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-6 text-center text-gray-500">
                      No attendance data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {canViewRequests && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Leave Requests</h2>
              <span className="text-xs text-gray-500">Pending approvals</span>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {pendingRequests.map((req) => (
                <div
                  key={req._id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {req.employee?.name || "Employee"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {req.typeName} •{" "}
                      {new Date(req.fromDate).toLocaleDateString()} -{" "}
                      {new Date(req.toDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-xs text-orange-600 font-semibold">Pending</div>
                </div>
              ))}
              {pendingRequests.length === 0 && (
                <div className="text-sm text-gray-500">No pending requests.</div>
              )}
            </div>
          </div>
        )}

        {canViewCalendar && (
          <LeaveGridCalendar
            title="Leave Calendar"
            monthValue={calendarMonth}
            onMonthChange={setCalendarMonth}
            requests={calendarLeaves}
            emptyMessage="No approved leaves."
          />
        )}
      </div>
    </DashboardLayout>
  );
}
