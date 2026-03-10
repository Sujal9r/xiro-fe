"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiCall from "../lib/api";
import { PERMISSIONS, PermissionKey } from "../lib/permissions";

const NAV_ITEMS: Array<{
  label: string;
  path: string;
  permission: PermissionKey;
}> = [
  { label: "Apply", path: "/leaves/apply", permission: PERMISSIONS.LEAVE_APPLY },
  { label: "My Leaves", path: "/leaves/my", permission: PERMISSIONS.LEAVE_VIEW_MY },
  {
    label: "Balance",
    path: "/leaves/balance",
    permission: PERMISSIONS.LEAVE_VIEW_BALANCE,
  },
  {
    label: "Requests",
    path: "/leaves/requests",
    permission: PERMISSIONS.LEAVE_REQUESTS_VIEW,
  },
  {
    label: "Calendar",
    path: "/leaves/calendar",
    permission: PERMISSIONS.LEAVE_CALENDAR_VIEW,
  },
  { label: "Policy", path: "/leaves/policy", permission: PERMISSIONS.LEAVE_POLICY_VIEW },
  {
    label: "Reports",
    path: "/leaves/reports",
    permission: PERMISSIONS.LEAVE_REPORTS_VIEW,
  },
];

export default function LeavesNav({ currentPath }: { currentPath: string }) {
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const me = await apiCall("/api/auth/me");
        setPermissions((me.permissions || []) as PermissionKey[]);
      } catch (error) {
      }
    };
    fetchPermissions();
  }, []);

  const allowed = NAV_ITEMS.filter((item) => permissions.includes(item.permission));

  if (allowed.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      {allowed.map((item) => {
        const active = currentPath === item.path;
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
