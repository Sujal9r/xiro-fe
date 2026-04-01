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

const PERMISSION_CACHE_KEY = "xiro.leave.permissions";

export default function LeavesNav({
  currentPath,
  permissions: providedPermissions,
}: {
  currentPath: string;
  permissions?: PermissionKey[];
}) {
  const [cachedPermissions, setCachedPermissions] = useState<PermissionKey[]>(
    () => providedPermissions || readCachedPermissions(),
  );
  const router = useRouter();
  const permissions = providedPermissions || cachedPermissions;

  useEffect(() => {
    if (providedPermissions) {
      cachePermissions(providedPermissions);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const me = await apiCall("/api/auth/me");
        const nextPermissions = (me.permissions || []) as PermissionKey[];
        setCachedPermissions(nextPermissions);
        cachePermissions(nextPermissions);
      } catch {
      }
    };
    if (permissions.length === 0) {
      fetchPermissions();
    }
  }, [providedPermissions, permissions.length]);

  const allowed = NAV_ITEMS.filter((item) => permissions.includes(item.permission));

  if (allowed.length === 0) return null;

  return (
    <div
      className="rounded-[26px] border p-2 shadow-sm"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--card) 92%, white), var(--card))",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex flex-wrap gap-2">
        {allowed.map((item) => {
          const active = currentPath === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="rounded-2xl px-4 py-2.5 text-sm font-medium transition"
              style={
                active
                  ? {
                      backgroundColor: "var(--accent-600)",
                      color: "#fff",
                      boxShadow:
                        "0 10px 24px color-mix(in srgb, var(--accent-500) 22%, transparent)",
                    }
                  : { color: "var(--foreground)" }
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function readCachedPermissions(): PermissionKey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(PERMISSION_CACHE_KEY);
    return raw ? (JSON.parse(raw) as PermissionKey[]) : [];
  } catch {
    return [];
  }
}

function cachePermissions(permissions: PermissionKey[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PERMISSION_CACHE_KEY, JSON.stringify(permissions));
  } catch {
  }
}
