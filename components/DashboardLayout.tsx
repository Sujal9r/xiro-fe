"use client";

import { Fragment, useEffect, useState } from "react";
import {
  HiOutlineViewGrid,
  HiOutlineUsers,
  HiOutlineTicket,
  HiOutlineCalendar,
  HiOutlineShieldCheck,
  HiOutlineClipboardCheck,
  HiOutlineCash,
  HiOutlineCog,
  HiOutlineClock,
  HiOutlineLocationMarker,
} from "react-icons/hi";
import { useRouter, usePathname } from "next/navigation";
import { Dialog, Transition } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import ProfileDropdown from "./ProfileDropdown";
import apiCall from "../lib/api";
import { PERMISSIONS, PermissionKey } from "../lib/permissions";
import ThemeToggle from "./ThemeToggle";

interface User {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "manager" | "hr" | "user" | "custom";
  permissions?: PermissionKey[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const data = await apiCall("/api/auth/me");
      setUser(data);

      const permissions = (data.permissions || []) as PermissionKey[];

      if (!canAccessPath(pathname, permissions)) {
        router.push(getDefaultPath(permissions));
      }
    } catch (error) {
      localStorage.removeItem("token");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const permissions = (user?.permissions || []) as PermissionKey[];
  const can = (perm: PermissionKey) => permissions.includes(perm);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const canViewEmployees =
    can(PERMISSIONS.VIEW_ADMIN_USERS) ||
    can(PERMISSIONS.VIEW_HR_EMPLOYEES) ||
    can(PERMISSIONS.VIEW_EMPLOYEES);
  const canManageShifts =
    can(PERMISSIONS.MANAGE_SHIFT_MANAGEMENT) ||
    can(PERMISSIONS.VIEW_SHIFT_MANAGEMENT) ||
    can(PERMISSIONS.MANAGE_USERS) ||
    can(PERMISSIONS.EDIT_EMPLOYEE);
  const canManageLocations = can(PERMISSIONS.MANAGE_USERS) || can(PERMISSIONS.EDIT_EMPLOYEE);

  const navItems = [
    can(PERMISSIONS.VIEW_DASHBOARD) && {
      label: "Dashboard",
      path: "/dashboard",
      icon: "dashboard",
    },
    canViewEmployees && {
      label: "Employees",
      path: "/admin/users",
      icon: "users",
    },
    canManageShifts && {
      label: "Shift Management",
      path: "/admin/shifts",
      icon: "shifts",
    },
    canManageLocations && {
      label: "Location Management",
      path: "/admin/locations",
      icon: "locations",
    },
    can(PERMISSIONS.VIEW_ADMIN_TICKETS) && {
      label: "Tickets",
      path: "/admin/tickets",
      icon: "tickets",
    },
    (can(PERMISSIONS.ATTENDANCE_PANEL_VIEW) ||
      can(PERMISSIONS.VIEW_ADMIN_ATTENDANCE)) && {
      label: "Attendance",
      path: "/attendance",
      icon: "attendance",
    },
    (can(PERMISSIONS.LEAVE_APPLY) ||
      can(PERMISSIONS.LEAVE_VIEW_MY) ||
      can(PERMISSIONS.LEAVE_VIEW_BALANCE) ||
      can(PERMISSIONS.LEAVE_REQUESTS_VIEW) ||
      can(PERMISSIONS.LEAVE_CALENDAR_VIEW) ||
      can(PERMISSIONS.LEAVE_POLICY_VIEW) ||
      can(PERMISSIONS.LEAVE_REPORTS_VIEW)) && {
      label: "Leaves",
      path: getLeavesDefaultPath(permissions),
      icon: "leave",
    },
    can(PERMISSIONS.VIEW_ADMIN_ROLES) && {
      label: "Role Management",
      path: "/admin/roles",
      icon: "roles",
    },
    can(PERMISSIONS.VIEW_ADMIN_FINANCE) && {
      label: "Finance",
      path: "/admin/finance",
      icon: "finance",
    },
    can(PERMISSIONS.VIEW_USER_TASKS) && {
      label: "My Tasks",
      path: "/user/tasks",
      icon: "tasks",
    },
    can(PERMISSIONS.VIEW_USER_FINANCE) && {
      label: "My Finance",
      path: "/user/finance",
      icon: "finance",
    },
    can(PERMISSIONS.VIEW_SETTINGS) && {
      label: "Settings",
      path: "/settings",
      icon: "settings",
    },
  ].filter(Boolean) as { label: string; path: string; icon: IconKey }[];

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* ================= MOBILE HEADER ================= */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="h-14 px-4 flex items-center justify-between">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-100 transition"
            aria-label="Open sidebar"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <span className="font-semibold text-gray-900">RBS</span>
          <ThemeToggle compact />
        </div>
      </div>

      {/* ================= MOBILE SIDEBAR ================= */}
      <Transition show={mobileSidebarOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 md:hidden"
          onClose={setMobileSidebarOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-200 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-200 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-72 max-w-full flex-col bg-white shadow-xl">
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
                  <span className="font-semibold text-gray-900">Atto App</span>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-100 transition"
                    aria-label="Close sidebar"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <nav className="px-3 py-4 space-y-1">
                  {navItems.map((item) => (
                    <SidebarNavButton
                      key={item.path}
                      label={item.label}
                      path={item.path}
                      icon={item.icon}
                      collapsed={false}
                      onNavigate={() => setMobileSidebarOpen(false)}
                    />
                  ))}
                </nav>
                <div className="mt-auto px-3 pb-4">
                  <ProfileDropdown showName fullWidth align="left" placement="top" />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside
        className={`hidden md:fixed md:left-0 md:top-0 md:h-screen md:flex md:flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-300 z-40 ${
          sidebarCollapsed ? "md:w-20" : "md:w-64"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            {!sidebarCollapsed && (
              <span className="font-semibold text-gray-900">Atto App</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle compact={sidebarCollapsed} />
            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-100 transition"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg
                className={`h-5 w-5 transition-transform duration-300 ${
                  sidebarCollapsed ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </div>
        </div>

        <nav className="px-2 py-3 space-y-2">
          {navItems.map((item) => (
            <SidebarNavButton
              key={item.path}
              label={item.label}
              path={item.path}
              icon={item.icon}
              collapsed={sidebarCollapsed}
            />
          ))}
        </nav>

        <div className="mt-auto px-3 pb-4">
          <div
            className={`flex items-center w-full ${
              sidebarCollapsed ? "justify-center" : "justify-start"
            }`}
          >
            <ProfileDropdown
              showName={!sidebarCollapsed}
              fullWidth={!sidebarCollapsed}
              align={sidebarCollapsed ? "right" : "left"}
              placement="top"
            />
          </div>
        </div>
      </aside>

      <div
        className={`transition-all duration-300 ml-0 ${
          sidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </div>
    </div>
  );
}


type IconKey =
  | "dashboard"
  | "users"
  | "tickets"
  | "attendance"
  | "roles"
  | "tasks"
  | "finance"
  | "leave"
  | "settings"
  | "shifts"
  | "locations";

const ICONS: Record<IconKey, React.ReactNode> = {
  dashboard: <HiOutlineViewGrid className="h-5 w-5" />,
  users: <HiOutlineUsers className="h-5 w-5" />,
  tickets: <HiOutlineTicket className="h-5 w-5" />,
  attendance: <HiOutlineCalendar className="h-5 w-5" />,
  roles: <HiOutlineShieldCheck className="h-5 w-5" />,
  tasks: <HiOutlineClipboardCheck className="h-5 w-5" />,
  finance: <HiOutlineCash className="h-5 w-5" />,
  leave: <HiOutlineCalendar className="h-5 w-5" />,
  settings: <HiOutlineCog className="h-5 w-5" />,
  shifts: <HiOutlineClock className="h-5 w-5" />,
  locations: <HiOutlineLocationMarker className="h-5 w-5" />,
};

function SidebarNavButton({
  label,
  path,
  icon,
  collapsed,
  onNavigate,
}: {
  label: string;
  path: string;
  icon: IconKey;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const active = pathname.startsWith(path);

  return (
    <button
      onClick={() => {
        router.push(path);
        onNavigate?.();
      }}
      className={`w-full flex items-center gap-3 h-fit px-3 py-2 rounded-lg text-sm font-medium transition ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-gray-700 hover:bg-gray-100"
      } ${collapsed ? "justify-center" : "justify-start"}`}
    >
      <span className={`${collapsed ? "" : "text-gray-700"} ${active ? "text-white" : ""}`}>
        {ICONS[icon]}
      </span>
      <span
        className={`transition-all duration-300 ${
          collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

const PATH_PERMISSIONS: Record<string, PermissionKey[]> = {
  "/dashboard": [PERMISSIONS.VIEW_DASHBOARD],
  "/admin/users": [
    PERMISSIONS.VIEW_ADMIN_USERS,
    PERMISSIONS.VIEW_HR_EMPLOYEES,
    PERMISSIONS.VIEW_EMPLOYEES,
  ],
  "/admin/shifts": [
    PERMISSIONS.VIEW_SHIFT_MANAGEMENT,
    PERMISSIONS.MANAGE_SHIFT_MANAGEMENT,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.EDIT_EMPLOYEE,
  ],
  "/admin/locations": [PERMISSIONS.MANAGE_USERS, PERMISSIONS.EDIT_EMPLOYEE],
  "/admin/tickets": [PERMISSIONS.VIEW_ADMIN_TICKETS],
  "/attendance": [
    PERMISSIONS.ATTENDANCE_PANEL_VIEW,
    PERMISSIONS.VIEW_ADMIN_ATTENDANCE,
  ],
  "/admin/roles": [PERMISSIONS.VIEW_ADMIN_ROLES],
  "/admin/finance": [PERMISSIONS.VIEW_ADMIN_FINANCE],
  "/hr/employees": [PERMISSIONS.VIEW_HR_EMPLOYEES],
  "/leaves/apply": [PERMISSIONS.LEAVE_APPLY],
  "/leaves/my": [PERMISSIONS.LEAVE_VIEW_MY],
  "/leaves/balance": [PERMISSIONS.LEAVE_VIEW_BALANCE],
  "/leaves/requests": [PERMISSIONS.LEAVE_REQUESTS_VIEW],
  "/leaves/calendar": [PERMISSIONS.LEAVE_CALENDAR_VIEW],
  "/leaves/policy": [PERMISSIONS.LEAVE_POLICY_VIEW],
  "/leaves/reports": [PERMISSIONS.LEAVE_REPORTS_VIEW],
  "/leaves": [
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.LEAVE_VIEW_MY,
    PERMISSIONS.LEAVE_VIEW_BALANCE,
    PERMISSIONS.LEAVE_REQUESTS_VIEW,
    PERMISSIONS.LEAVE_CALENDAR_VIEW,
    PERMISSIONS.LEAVE_POLICY_VIEW,
    PERMISSIONS.LEAVE_REPORTS_VIEW,
  ],
  "/user/tasks": [PERMISSIONS.VIEW_USER_TASKS],
  "/user/finance": [PERMISSIONS.VIEW_USER_FINANCE],
  "/settings": [PERMISSIONS.VIEW_SETTINGS],
};

const canAccessPath = (pathname: string, permissions: PermissionKey[]) => {
  if (pathname === "/profile") return true;
  const matched = Object.keys(PATH_PERMISSIONS).find((path) =>
    pathname.startsWith(path),
  );
  if (!matched) return true;
  return PATH_PERMISSIONS[matched].some((perm) => permissions.includes(perm));
};

const getDefaultPath = (permissions: PermissionKey[]) => {
  if (permissions.includes(PERMISSIONS.VIEW_DASHBOARD)) {
    return "/dashboard";
  }
  return "/profile";
};

const getLeavesDefaultPath = (permissions: PermissionKey[]) => {
  if (permissions.includes(PERMISSIONS.LEAVE_APPLY)) return "/leaves/apply";
  if (permissions.includes(PERMISSIONS.LEAVE_VIEW_MY)) return "/leaves/my";
  if (permissions.includes(PERMISSIONS.LEAVE_VIEW_BALANCE)) return "/leaves/balance";
  if (permissions.includes(PERMISSIONS.LEAVE_REQUESTS_VIEW)) return "/leaves/requests";
  if (permissions.includes(PERMISSIONS.LEAVE_CALENDAR_VIEW)) return "/leaves/calendar";
  if (permissions.includes(PERMISSIONS.LEAVE_POLICY_VIEW)) return "/leaves/policy";
  if (permissions.includes(PERMISSIONS.LEAVE_REPORTS_VIEW)) return "/leaves/reports";
  return "/leaves";
};
