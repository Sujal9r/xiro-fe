"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import LeavesNav from "../../../components/LeavesNav";
import apiCall from "../../../lib/api";
import { PERMISSIONS, PermissionKey } from "../../../lib/permissions";
import { useAlert } from "../../../components/AlertProvider";

interface ReportItem {
  _id: string;
  employee?: { name: string; email: string };
  typeName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
}

interface SummaryItem {
  employee?: { name: string; email: string };
  totals: Record<string, number>;
  totalDays: number;
}

export default function LeaveReportsPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [report, setReport] = useState<ReportItem[]>([]);
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportData, summaryData, me] = await Promise.all([
        apiCall(`/api/leaves/reports/monthly?month=${month}`),
        apiCall("/api/leaves/reports/summary"),
        apiCall("/api/auth/me"),
      ]);
      setReport(reportData);
      setSummary(summaryData);
      setPermissions((me.permissions || []) as PermissionKey[]);
    } catch (error) {
      showAlert(error instanceof Error ? error.message : "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  const canExport = permissions.includes(PERMISSIONS.LEAVE_REPORTS_EXPORT);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const handleExport = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    window.open(`${apiUrl}/api/leaves/reports/export?month=${month}`, "_blank");
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
          <h1 className="text-3xl font-bold text-gray-900">Leave Reports</h1>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border border-gray-200 rounded-md p-2 text-black"
            />
            <button
              onClick={fetchData}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
            {canExport && (
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Export
              </button>
            )}
          </div>
        </div>
        <LeavesNav currentPath="/leaves/reports" />

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Report</h2>
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
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Days
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.map((item) => (
                  <tr key={item._id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.employee?.name || "-"}
                      <div className="text-xs text-gray-500">
                        {item.employee?.email || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.typeName}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(item.fromDate)} - {formatDate(item.toDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.totalDays}</td>
                  </tr>
                ))}
                {report.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-gray-500">
                      No data for this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Employee Summary</h2>
          </div>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Totals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Days
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.employee?.name || "-"}
                      <div className="text-xs text-gray-500">
                        {item.employee?.email || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {Object.entries(item.totals || {})
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(", ")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.totalDays}
                    </td>
                  </tr>
                ))}
                {summary.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-gray-500">
                      No summary data.
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
