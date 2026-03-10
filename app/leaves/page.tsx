"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import LeavesNav from "../../components/LeavesNav";
import apiCall from "../../lib/api";
import { PERMISSIONS, PermissionKey } from "../../lib/permissions";

const SECTIONS: Array<{
  title: string;
  description: string;
  path: string;
  permission: PermissionKey;
}> = [
  {
    title: "Apply Leave",
    description: "Request a new leave with type, dates, and reason.",
    path: "/leaves/apply",
    permission: PERMISSIONS.LEAVE_APPLY,
  },
  {
    title: "My Leaves",
    description: "Track your applied leaves and statuses.",
    path: "/leaves/my",
    permission: PERMISSIONS.LEAVE_VIEW_MY,
  },
  {
    title: "Leave Balance",
    description: "View remaining leaves and history.",
    path: "/leaves/balance",
    permission: PERMISSIONS.LEAVE_VIEW_BALANCE,
  },
  {
    title: "Leave Requests",
    description: "Approve or reject team leave requests.",
    path: "/leaves/requests",
    permission: PERMISSIONS.LEAVE_REQUESTS_VIEW,
  },
  {
    title: "Leave Calendar",
    description: "Calendar view of approved leaves.",
    path: "/leaves/calendar",
    permission: PERMISSIONS.LEAVE_CALENDAR_VIEW,
  },
  {
    title: "Leave Policy",
    description: "Define leave types and yearly limits.",
    path: "/leaves/policy",
    permission: PERMISSIONS.LEAVE_POLICY_VIEW,
  },
  {
    title: "Leave Reports",
    description: "Monthly report and employee summary.",
    path: "/leaves/reports",
    permission: PERMISSIONS.LEAVE_REPORTS_VIEW,
  },
];

export default function LeavesHomePage() {
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const me = await apiCall("/api/auth/me");
      setPermissions((me.permissions || []) as PermissionKey[]);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const allowedSections = SECTIONS.filter((section) =>
    permissions.includes(section.permission),
  );

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leaves</h1>
          <p className="text-sm text-gray-500 mt-1">
            Choose a leave section from the navigation below.
          </p>
        </div>
        <LeavesNav currentPath="/leaves" />
        {allowedSections.length === 0 && (
          <div className="text-gray-500">No leave sections available.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
