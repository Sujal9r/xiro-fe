"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import LeavesNav from "../../../components/LeavesNav";
import apiCall from "../../../lib/api";
import Modal from "../../../components/Modal";
import { PERMISSIONS, PermissionKey } from "../../../lib/permissions";
import { useAlert } from "../../../components/AlertProvider";

interface LeaveRequest {
  _id: string;
  employee?: { name: string; email: string };
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

interface RegularizationRequest {
  _id: string;
  user?: { name?: string; email?: string };
  type: "penalty" | "logs";
  date: string;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  actionNote?: string;
}

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [regularizationRequests, setRegularizationRequests] = useState<RegularizationRequest[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    fromDate: "",
    toDate: "",
    employeeName: "",
  });
  const [activeRequest, setActiveRequest] = useState<LeaveRequest | null>(null);
  const [activeRegularizationRequest, setActiveRegularizationRequest] =
    useState<RegularizationRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const me = await apiCall("/api/auth/me");
      const canReviewRegularization = (me.permissions || []).includes(
        PERMISSIONS.ATTENDANCE_REGULARIZATION_REVIEW,
      );
      const [reqs, regularizationReqs] = await Promise.all([
        apiCall("/api/leaves/requests"),
        canReviewRegularization
          ? apiCall("/api/attendance/regularization/requests")
          : Promise.resolve([]),
      ]);
      setRequests(reqs);
      setRegularizationRequests(regularizationReqs);
      setPermissions((me.permissions || []) as PermissionKey[]);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const canApprove = permissions.includes(PERMISSIONS.LEAVE_REQUESTS_APPROVE);
  const canReject = permissions.includes(PERMISSIONS.LEAVE_REQUESTS_REJECT);
  const canReviewRegularization = permissions.includes(
    PERMISSIONS.ATTENDANCE_REGULARIZATION_REVIEW,
  );

  const filtered = useMemo(() => {
    return requests.filter((req) => {
      if (filters.status && req.status !== filters.status) return false;
      if (filters.employeeName) {
        const name = req.employee?.name || "";
        if (!name.toLowerCase().includes(filters.employeeName.toLowerCase()))
          return false;
      }
      if (filters.fromDate) {
        if (new Date(req.fromDate) < new Date(filters.fromDate)) return false;
      }
      if (filters.toDate) {
        if (new Date(req.toDate) > new Date(filters.toDate)) return false;
      }
      return true;
    });
  }, [requests, filters]);

  const openAction = (request: LeaveRequest, type: "approve" | "reject") => {
    setActiveRequest(request);
    setActionType(type);
    setRemarks("");
  };

  const handleAction = async () => {
    if ((!activeRequest && !activeRegularizationRequest) || !actionType) return;
    try {
      if (activeRegularizationRequest) {
        await apiCall(
          `/api/attendance/regularization/${activeRegularizationRequest._id}/review`,
          {
            method: "POST",
            body: JSON.stringify({ action: actionType, actionNote: remarks }),
          },
        );
      } else if (activeRequest) {
        await apiCall(`/api/leaves/requests/${activeRequest._id}/${actionType}`, {
          method: "PUT",
          body: JSON.stringify({ remarks }),
        });
      }
      setActiveRequest(null);
      setActiveRegularizationRequest(null);
      setActionType(null);
      fetchData();
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message || "")
          : "";
      showAlert(message || "Failed to update request");
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatLeaveUnit = (req: LeaveRequest) => {
    const unit = req.leaveUnit || "full_day";
    if (unit === "half_day") {
      return req.halfDaySession === "second_half"
        ? "2nd Half (Shift End)"
        : "1st Half (Shift Start)";
    }
    if (unit === "partial_day") {
      const position = req.partialDayPosition === "end" ? "Shift End" : "Shift Start";
      return `Partial (${req.partialMinutes || 0} min, ${position})`;
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Leave Requests</h1>
          <button
            onClick={fetchData}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
        <LeavesNav currentPath="/leaves/requests" />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white rounded-lg shadow p-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border border-gray-200 rounded-md p-2 text-black"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            type="date"
            value={filters.fromDate}
            onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
            className="border border-gray-200 rounded-md p-2 text-black"
          />
          <input
            type="date"
            value={filters.toDate}
            onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
            className="border border-gray-200 rounded-md p-2 text-black"
          />
          <input
            type="text"
            placeholder="Employee name"
            value={filters.employeeName}
            onChange={(e) =>
              setFilters({ ...filters, employeeName: e.target.value })
            }
            className="border border-gray-200 rounded-md p-2 text-black"
          />
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employee
                  </th>
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
                  {(canApprove || canReject) && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((req) => (
                  <tr key={req._id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {req.employee?.name || "-"}
                      <div className="text-xs text-gray-500">
                        {req.employee?.email || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{req.typeName}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(req.fromDate)} - {formatDate(req.toDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{req.totalDays}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatLeaveUnit(req)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                      {req.status}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {req.remarks || "-"}
                    </td>
                    {(canApprove || canReject) && (
                      <td className="px-6 py-4 text-sm space-x-2">
                        {req.status === "pending" && canApprove && (
                          <button
                            onClick={() => openAction(req, "approve")}
                            className="text-green-600 hover:text-green-800"
                          >
                            Approve
                          </button>
                        )}
                        {req.status === "pending" && canReject && (
                          <button
                            onClick={() => openAction(req, "reject")}
                            className="text-red-600 hover:text-red-800"
                          >
                            Reject
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={canApprove || canReject ? 8 : 7}
                      className="px-6 py-6 text-center text-gray-500"
                    >
                      No leave requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {canReviewRegularization && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Regularization Requests</h2>
            </div>
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Requested Log
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Remarks
                    </th>
                    {(canApprove || canReject) && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {regularizationRequests.map((req) => (
                    <tr key={req._id}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {req.user?.name || "-"}
                        <div className="text-xs text-gray-500">{req.user?.email || ""}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {req.type === "penalty" ? "Regularize" : "Regularize Logs"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatDate(req.date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {req.type === "logs"
                          ? `${req.requestedCheckIn ? new Date(req.requestedCheckIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "--"} - ${
                              req.requestedCheckOut ? new Date(req.requestedCheckOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "--"
                            }`
                          : "Penalty remove"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 capitalize">{req.status}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {req.actionNote || req.reason || "-"}
                      </td>
                      {(canApprove || canReject) && (
                        <td className="px-6 py-4 text-sm space-x-2">
                          {req.status === "pending" && canApprove && (
                            <button
                              onClick={() => {
                                setActiveRegularizationRequest(req);
                                setActiveRequest(null);
                                setActionType("approve");
                                setRemarks("");
                              }}
                              className="text-green-600 hover:text-green-800"
                            >
                              Approve
                            </button>
                          )}
                          {req.status === "pending" && canReject && (
                            <button
                              onClick={() => {
                                setActiveRegularizationRequest(req);
                                setActiveRequest(null);
                                setActionType("reject");
                                setRemarks("");
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {regularizationRequests.length === 0 && (
                    <tr>
                      <td
                        colSpan={canApprove || canReject ? 7 : 6}
                        className="px-6 py-6 text-center text-gray-500"
                      >
                        No regularization requests.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={(!!activeRequest || !!activeRegularizationRequest) && !!actionType}
        title={
          actionType === "approve"
            ? activeRegularizationRequest
              ? "Approve Regularization"
              : "Approve Leave"
            : activeRegularizationRequest
            ? "Reject Regularization"
            : "Reject Leave"
        }
        onClose={() => {
          setActiveRequest(null);
          setActiveRegularizationRequest(null);
          setActionType(null);
        }}
        size="md"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            {activeRegularizationRequest
              ? `${activeRegularizationRequest.user?.name || "Employee"} • ${
                  activeRegularizationRequest.type === "penalty"
                    ? "Regularize"
                    : "Regularize Logs"
                }`
              : `${activeRequest?.employee?.name} • ${activeRequest?.typeName}`}
          </div>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add remarks (optional)"
            className="w-full rounded-md border border-gray-300 p-2 text-black"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAction}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700"
            >
              Submit
            </button>
            <button
              onClick={() => {
                setActiveRequest(null);
                setActiveRegularizationRequest(null);
                setActionType(null);
              }}
              className="flex-1 rounded-lg bg-gray-200 py-2 text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
