"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import LeaveGridCalendar, {
  LeaveGridRequest,
} from "../../../components/LeaveGridCalendar";
import LeavesNav from "../../../components/LeavesNav";
import apiCall from "../../../lib/api";

export default function LeaveCalendarPage() {
  const [requests, setRequests] = useState<LeaveGridRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("approved");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const [year, month] = calendarMonth.split("-").map(Number);
      const fromDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const toDate = new Date(year, month, 0).toISOString().slice(0, 10);

      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("fromDate", fromDate);
      params.set("toDate", toDate);

      const data = await apiCall(`/api/leaves/calendar?${params.toString()}`);
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, calendarMonth]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Leave Calendar</h1>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full max-w-56 rounded-md border border-gray-200 p-2 text-black"
          >
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <LeavesNav currentPath="/leaves/calendar" />

        <LeaveGridCalendar
          title="Leave Calendar"
          monthValue={calendarMonth}
          onMonthChange={setCalendarMonth}
          requests={requests}
          emptyMessage="No leave data for this month."
        />
      </div>
    </DashboardLayout>
  );
}
