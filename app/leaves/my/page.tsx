"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import LeavesNav from "../../../components/LeavesNav";
import apiCall from "../../../lib/api";
import { PERMISSIONS, PermissionKey } from "../../../lib/permissions";
import { useAlert } from "../../../components/AlertProvider";

interface LeaveRequest {
  _id: string;
  typeName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  leaveUnit?: "full_day" | "half_day" | "partial_day";
  halfDaySession?: "first_half" | "second_half" | "";
  partialMinutes?: number;
  partialDayPosition?: "start" | "end" | "";
  status: string;
  remarks?: string;
}

export default function MyLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leaveData, me] = await Promise.all([
        apiCall("/api/leaves/my"),
        apiCall("/api/auth/me"),
      ]);
      setLeaves(leaveData);
      setPermissions((me.permissions || []) as PermissionKey[]);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const canCancel = permissions.includes(PERMISSIONS.LEAVE_CANCEL_MY);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this leave request?")) return;
    try {
      await apiCall(`/api/leaves/my/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message || "")
          : "";
      showAlert(message || "Failed to cancel leave");
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatLeaveUnit = (leave: LeaveRequest) => {
    const unit = leave.leaveUnit || "full_day";
    if (unit === "half_day") {
      return leave.halfDaySession === "second_half"
        ? "2nd Half (Shift End)"
        : "1st Half (Shift Start)";
    }
    if (unit === "partial_day") {
      const position = leave.partialDayPosition === "end" ? "Shift End" : "Shift Start";
      return `Partial (${leave.partialMinutes || 0} min, ${position})`;
    }
    return "Full Day";
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">My Leaves</h1>
        <LeavesNav currentPath="/leaves/my" />
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Remarks
                  </th>
                  {canCancel && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.map((leave) => (
                  <tr key={leave._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leave.typeName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(leave.fromDate)} - {formatDate(leave.toDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{leave.totalDays}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatLeaveUnit(leave)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                      {leave.status}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {leave.remarks || "-"}
                    </td>
                    {canCancel && (
                      <td className="px-6 py-4 text-sm">
                        {leave.status === "pending" ? (
                          <button
                            onClick={() => handleCancel(leave._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr>
                    <td colSpan={canCancel ? 7 : 6} className="px-6 py-6 text-center text-gray-500">
                      No leave requests yet.
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
