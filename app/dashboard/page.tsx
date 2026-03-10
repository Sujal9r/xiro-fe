"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import Modal from "../../components/Modal";
import apiCall from "../../lib/api";
import { PERMISSIONS, PermissionKey } from "../../lib/permissions";
import { useAlert } from "../../components/AlertProvider";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AdminDashboardData {
  stats: {
    totalUsers: number;
    totalTickets: number;
    pendingTickets: number;
    startedTickets: number;
    completedTickets: number;
  };
  recentTickets: Array<{
    _id: string;
    title: string;
    status: string;
    createdAt: string;
    assignedTo?: { name?: string } | null;
  }>;
}

interface Employee {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  customRole?: { name: string } | null;
  isActive: boolean;
  createdAt?: string;
  shift?: { startTime?: string; endTime?: string };
  attendanceLogs?: AttendanceLog[];
}

interface SessionLog {
  checkIn: string;
  checkOut?: string;
  duration?: number;
  shiftStartTime?: string;
  shiftEndTime?: string;
  isLate?: boolean;
  lateMinutes?: number;
  hasPenalty?: boolean;
  isEarlyClockOut?: boolean;
}

interface AttendanceLog {
  _id?: string;
  checkIn: string;
  checkOut?: string;
  duration?: number;
  sessions?: SessionLog[];
  shiftStartTime?: string;
  shiftEndTime?: string;
  isLate?: boolean;
  lateMinutes?: number;
  hasPenalty?: boolean;
  isEarlyClockOut?: boolean;
  isRegularized?: boolean;
  regularizedType?: "" | "penalty" | "logs";
  regularizedAt?: string;
}

interface RegularizationRequest {
  _id: string;
  user?: { _id?: string; name?: string; email?: string } | null;
  attendanceLog?: string | null;
  type: "penalty" | "logs";
  date: string;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  actionNote?: string;
  handledBy?: { _id?: string; name?: string; email?: string } | null;
  handledAt?: string | null;
  createdAt: string;
}

interface MeDashboardData {
  stats: {
    total: number;
    pending: number;
    started: number;
    completed: number;
  };
  tickets: Array<{
    _id: string;
    title: string;
    description: string;
    status: string;
    createdAt: string;
  }>;
  attendanceLogs: AttendanceLog[];
  approvedLeaves?: ApprovedLeave[];
  regularizationBalance?: number;
  regularizationRequests?: RegularizationRequest[];
}

interface ApprovedLeave {
  fromDate: string;
  toDate: string;
  totalDays?: number;
  halfDay?: boolean;
  leaveUnit?: "full_day" | "half_day" | "partial_day";
  halfDaySession?: "first_half" | "second_half" | "";
  partialMinutes?: number;
  partialDayPosition?: "start" | "end" | "";
  typeName?: string;
}

interface OfficeBranch {
  id: string;
  name: string;
  code?: string;
  center: { lat: number; lng: number };
  radiusMeters: number;
  isActive: boolean;
}

interface GeofenceConfig {
  enabled: boolean;
  name: string;
  enforceClockOut: boolean;
  branches: OfficeBranch[];
}

interface DashboardResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt?: string;
    shift?: { startTime?: string; endTime?: string };
  };
  permissions: PermissionKey[];
  admin?: AdminDashboardData;
  hr?: {
    stats: {
      totalEmployees: number;
      activeEmployees: number;
      disabledEmployees: number;
    };
    attendanceEmployees: Employee[];
    regularizationRequests?: RegularizationRequest[];
  };
  me?: MeDashboardData;
}

type RangeOption = 7 | 30 | 90;

const DEFAULT_SHIFT_START = "10:00";
const DEFAULT_SHIFT_END = "19:00";
const DEFAULT_LUNCH_START = "13:00";
const LUNCH_BREAK_MINUTES = 60;
const SHIFT_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PENALTY_LATE_MINUTES = 15;
const EARTH_RADIUS_METERS = 6371000;

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceBetween = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
};

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatShiftTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const dt = new Date();
  dt.setHours(hours, minutes, 0, 0);
  return dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

const formatMinutesAsTime = (minutes: number) => {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  return formatShiftTime(`${hh}:${mm}`);
};

const formatLateDuration = (lateMinutes: number) => {
  const safeMinutes = Math.max(0, lateMinutes);
  if (safeMinutes <= 59) return `${safeMinutes} min`;
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const resolveArrivalStatus = (
  lateMinutes: number,
  hasPenalty: boolean,
  suppressPenalty = false,
) => {
  const lateLabel = formatLateDuration(lateMinutes);
  if (!suppressPenalty && (hasPenalty || lateMinutes > PENALTY_LATE_MINUTES)) {
    return {
      label: `Penalty (${lateLabel} late)`,
      className: "bg-red-100 text-red-700",
    };
  }
  if (lateMinutes > 0) {
    return {
      label: `Late by ${lateLabel}`,
      className: "bg-amber-100 text-amber-700",
    };
  }
  return {
    label: "On Time",
    className: "bg-emerald-100 text-emerald-700",
  };
};

const toDateKey = (value: Date | string) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [clocking, setClocking] = useState(false);
  const [range, setRange] = useState<RangeOption>(30);
  const [now, setNow] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [geofence, setGeofence] = useState<GeofenceConfig | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationAction, setLocationAction] = useState<"clockIn" | "clockOut">("clockIn");
  const [geoChecking, setGeoChecking] = useState(false);
  const [geoAllowed, setGeoAllowed] = useState(false);
  const [geoMessage, setGeoMessage] = useState("");
  const [geoDistance, setGeoDistance] = useState<number | null>(null);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(
    null,
  );
  const [matchedBranch, setMatchedBranch] = useState<OfficeBranch | null>(null);
  const [regularizeModalOpen, setRegularizeModalOpen] = useState(false);
  const [regularizeLogsModalOpen, setRegularizeLogsModalOpen] = useState(false);
  const [regularizeDate, setRegularizeDate] = useState(toDateKey(new Date()));
  const [regularizeReason, setRegularizeReason] = useState("");
  const [regularizeLogCheckIn, setRegularizeLogCheckIn] = useState("");
  const [regularizeLogCheckOut, setRegularizeLogCheckOut] = useState("");
  const [regularizationSubmitting, setRegularizationSubmitting] = useState(false);
  const [regularizationActionLoading, setRegularizationActionLoading] = useState<string | null>(
    null,
  );
  const [activeLogMenuKey, setActiveLogMenuKey] = useState<string | null>(null);
  const [activeLogMenuPosition, setActiveLogMenuPosition] = useState<{
    top: number;
    left: number;
    openUp: boolean;
  } | null>(null);
  const [activeLogMenuContext, setActiveLogMenuContext] = useState<{
    date: string;
    checkIn: string;
    checkOut: string;
  } | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        (!target.closest("[data-log-menu-root='true']") &&
          !target.closest("[data-log-floating-menu='true']"))
      ) {
        setActiveLogMenuKey(null);
        setActiveLogMenuPosition(null);
        setActiveLogMenuContext(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!activeLogMenuKey) return;
    const closeFloatingMenu = () => {
      setActiveLogMenuKey(null);
      setActiveLogMenuPosition(null);
      setActiveLogMenuContext(null);
    };
    window.addEventListener("scroll", closeFloatingMenu, true);
    window.addEventListener("resize", closeFloatingMenu);
    return () => {
      window.removeEventListener("scroll", closeFloatingMenu, true);
      window.removeEventListener("resize", closeFloatingMenu);
    };
  }, [activeLogMenuKey]);

  const fetchDashboard = async () => {
    try {
      const dashboardData = await apiCall("/api/dashboard");
      setData(dashboardData);
      if ((dashboardData.permissions || []).includes(PERMISSIONS.ATTENDANCE_CLOCK)) {
        try {
          const geofenceData = await apiCall("/api/attendance/geofence");
          setGeofence(geofenceData as GeofenceConfig);
        } catch (error) {
        }
      }
      if (dashboardData?.hr?.attendanceEmployees?.length) {
        setSelectedEmployee(dashboardData.hr.attendanceEmployees[0]);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const evaluateLocation = (
    coords: { lat: number; lng: number; accuracy: number },
    action: "clockIn" | "clockOut",
  ) => {
    if (!geofence?.enabled) {
      setGeoAllowed(true);
      setGeoDistance(0);
      setMatchedBranch(null);
      setGeoMessage("Location check is disabled.");
      return;
    }

    const activeBranches = (geofence.branches || []).filter((branch) => branch.isActive);
    if (activeBranches.length === 0) {
      setGeoAllowed(false);
      setGeoMessage("No office branch area configured yet.");
      setMatchedBranch(null);
      setGeoDistance(null);
      return;
    }

    if (action === "clockOut" && geofence.enforceClockOut === false) {
      setGeoAllowed(true);
      setGeoMessage("Clock-out is allowed without location restriction.");
      setMatchedBranch(null);
      setGeoDistance(0);
      return;
    }

    let nearest: { branch: OfficeBranch; distance: number } | null = null;
    let matched: { branch: OfficeBranch; distance: number } | null = null;

    for (const branch of activeBranches) {
      const distance = distanceBetween(
        branch.center.lat,
        branch.center.lng,
        coords.lat,
        coords.lng,
      );
      if (!nearest || distance < nearest.distance) {
        nearest = { branch, distance };
      }
      if (distance <= branch.radiusMeters) {
        matched = { branch, distance };
        break;
      }
    }

    setGeoDistance(Math.round((matched || nearest)?.distance || 0));
    setMatchedBranch((matched || nearest)?.branch || null);
    if (matched) {
      setGeoAllowed(true);
      setGeoMessage(`Inside office area: ${matched.branch.name}`);
    } else {
      setGeoAllowed(false);
      setGeoMessage("Outside office area. Move inside branch boundary to continue.");
    }
  };

  const requestCurrentLocation = (action: "clockIn" | "clockOut") => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoAllowed(false);
      setGeoChecking(false);
      setGeoMessage("Geolocation is not supported on this device/browser.");
      return;
    }

    setGeoChecking(true);
    setGeoAllowed(false);
    setGeoMessage("Checking your current location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setGeoCoords(coords);
        evaluateLocation(coords, action);
        setGeoChecking(false);
      },
      (error) => {
        setGeoChecking(false);
        setGeoAllowed(false);
        setGeoMessage(error.message || "Unable to access location.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    if (!locationModalOpen) {
      if (geoWatchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoAllowed(false);
      setGeoChecking(false);
      setGeoMessage("Geolocation is not supported on this device/browser.");
      return;
    }

    setGeoChecking(true);
    setGeoMessage("Tracking your live location...");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setGeoCoords(coords);
        evaluateLocation(coords, locationAction);
        setGeoChecking(false);
      },
      (error) => {
        setGeoAllowed(false);
        setGeoChecking(false);
        setGeoMessage(error.message || "Unable to access live location.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );

    geoWatchIdRef.current = watchId;

    return () => {
      if (geoWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
    };
  }, [locationModalOpen, locationAction]);

  const permissions = (data?.permissions || []) as PermissionKey[];
  const canClock = permissions.includes(PERMISSIONS.ATTENDANCE_CLOCK);
  const canRegularize = permissions.includes(PERMISSIONS.ATTENDANCE_REGULARIZATION_REQUEST);
  const canReviewRegularization = permissions.includes(
    PERMISSIONS.ATTENDANCE_REGULARIZATION_REVIEW,
  );

  const attendance = data?.me?.attendanceLogs || [];
  const approvedLeaves = data?.me?.approvedLeaves || [];
  const tickets = data?.me?.tickets || [];
  const myRegularizationRequests = data?.me?.regularizationRequests || [];
  const hrRegularizationRequests = data?.hr?.regularizationRequests || [];
  const regularizationBalance = Number(data?.me?.regularizationBalance || 0);
  const shiftStartTime = SHIFT_TIME_PATTERN.test(data?.user?.shift?.startTime || "")
    ? (data?.user?.shift?.startTime as string)
    : DEFAULT_SHIFT_START;
  const shiftEndTime = SHIFT_TIME_PATTERN.test(data?.user?.shift?.endTime || "")
    ? (data?.user?.shift?.endTime as string)
    : DEFAULT_SHIFT_END;
  const shiftStartMinutes = toMinutes(shiftStartTime);
  const shiftEndMinutes = toMinutes(shiftEndTime);
  const shiftDurationMinutes = Math.max(60, shiftEndMinutes - shiftStartMinutes);
  const lunchStartBase = toMinutes(DEFAULT_LUNCH_START);
  const lunchStartMinutes = Math.min(
    Math.max(lunchStartBase, shiftStartMinutes + 30),
    shiftEndMinutes - 30,
  );
  const lunchEndMinutes = Math.min(shiftEndMinutes, lunchStartMinutes + LUNCH_BREAK_MINUTES);
  const lunchOffsetPercent =
    ((lunchStartMinutes - shiftStartMinutes) / shiftDurationMinutes) * 100;
  const lunchWidthPercent =
    ((lunchEndMinutes - lunchStartMinutes) / shiftDurationMinutes) * 100;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const resolveOpenSession = () => {
    for (let i = attendance.length - 1; i >= 0; i -= 1) {
      const log = attendance[i];
      if (log.sessions && log.sessions.length > 0) {
        const open = [...log.sessions].reverse().find((session) => !session.checkOut);
        if (open) return open;
      }
      if (!log.checkOut) {
        return { checkIn: log.checkIn };
      }
    }
    return null;
  };

  const openSession = resolveOpenSession();
  const isClockedIn = !!openSession;
  const timingProgressPercent = Math.min(
    100,
    Math.max(0, ((nowMinutes - shiftStartMinutes) / shiftDurationMinutes) * 100),
  );
  const timingFillColor = "color-mix(in srgb, var(--accent-500) 58%, white)";

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const performClockAction = async (
    action: "clockIn" | "clockOut",
    coords?: { lat: number; lng: number; accuracy: number } | null,
  ) => {
    setClocking(true);
    try {
      const endpoint = action === "clockIn" ? "/api/attendance/clock-in" : "/api/attendance/clock-out";
      const res = await apiCall(endpoint, {
        method: "POST",
        body: JSON.stringify(
          coords
            ? {
                latitude: coords.lat,
                longitude: coords.lng,
                accuracy: coords.accuracy,
              }
            : {},
        ),
      });
      setData((prev) =>
        prev?.me
          ? {
              ...prev,
              me: { ...prev.me, attendanceLogs: res.attendanceLogs || [] },
            }
          : prev,
      );
      setLocationModalOpen(false);
    } catch (error) {
      showAlert(
        getErrorMessage(error, action === "clockIn" ? "Failed to clock in" : "Failed to clock out"),
      );
    } finally {
      setClocking(false);
    }
  };

  const handleClockIn = async () => {
    if (!geofence?.enabled) {
      await performClockAction("clockIn");
      return;
    }
    setLocationAction("clockIn");
    setLocationModalOpen(true);
    requestCurrentLocation("clockIn");
  };

  const handleClockOut = async () => {
    if (!geofence?.enabled || geofence.enforceClockOut === false) {
      await performClockAction("clockOut", geofence?.enabled ? geoCoords : undefined);
      return;
    }
    setLocationAction("clockOut");
    setLocationModalOpen(true);
    requestCurrentLocation("clockOut");
  };

  const refreshRegularizationFromDashboard = async () => {
    const dashboardData = await apiCall("/api/dashboard");
    setData((prev) =>
      prev
        ? {
            ...prev,
            me: dashboardData.me || prev.me,
            hr: dashboardData.hr || prev.hr,
          }
        : dashboardData,
    );
  };

  const submitRegularization = async (
    type: "penalty" | "logs",
    payload: { date: string; requestedCheckIn?: string; requestedCheckOut?: string; reason?: string },
  ) => {
    setRegularizationSubmitting(true);
    try {
      await apiCall("/api/attendance/regularization/request", {
        method: "POST",
        body: JSON.stringify({ type, ...payload }),
      });
      await refreshRegularizationFromDashboard();
      showAlert("Regularization request submitted");
      setRegularizeReason("");
      if (type === "logs") {
        setRegularizeLogCheckIn("");
        setRegularizeLogCheckOut("");
        setRegularizeLogsModalOpen(false);
      } else {
        setRegularizeModalOpen(false);
      }
    } catch (error) {
      showAlert(getErrorMessage(error, "Failed to submit regularization request"));
    } finally {
      setRegularizationSubmitting(false);
    }
  };

  const handleRegularizePenalty = async () => {
    await submitRegularization("penalty", {
      date: regularizeDate,
      reason: regularizeReason.trim(),
    });
  };

  const handleRegularizeLogs = async () => {
    await submitRegularization("logs", {
      date: regularizeDate,
      requestedCheckIn: regularizeLogCheckIn
        ? `${regularizeDate}T${regularizeLogCheckIn}:00`
        : undefined,
      requestedCheckOut: regularizeLogCheckOut
        ? `${regularizeDate}T${regularizeLogCheckOut}:00`
        : undefined,
      reason: regularizeReason.trim(),
    });
  };

  const handleReviewRegularization = async (requestId: string, action: "approve" | "reject") => {
    setRegularizationActionLoading(requestId);
    try {
      await apiCall(`/api/attendance/regularization/${requestId}/review`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await refreshRegularizationFromDashboard();
      showAlert(`Request ${action === "approve" ? "approved" : "rejected"}`);
    } catch (error) {
      showAlert(getErrorMessage(error, "Failed to update regularization request"));
    } finally {
      setRegularizationActionLoading(null);
    }
  };

  const openRegularizeFromLog = (
    mode: "penalty" | "logs",
    logDate: string,
    startLog?: string,
    endLog?: string,
  ) => {
    setRegularizeDate(logDate);
    setRegularizeReason("");
    setActiveLogMenuKey(null);
    if (mode === "penalty") {
      setRegularizeModalOpen(true);
      return;
    }
    setRegularizeLogCheckIn(startLog || "");
    setRegularizeLogCheckOut(endLog || "");
    setRegularizeLogsModalOpen(true);
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

  const toInputTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "started":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const startOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const weekStats = useMemo(() => {
    const start = startOfWeek(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const weekSessions = attendance
      .flatMap((log) => {
        if (Array.isArray(log.sessions) && log.sessions.length > 0) {
          return log.sessions.map((session) => ({ ...session }));
        }
        return [{ checkIn: log.checkIn, checkOut: log.checkOut, duration: log.duration }];
      })
      .filter((session) => {
        const checkInDate = new Date(session.checkIn);
        return checkInDate >= start && checkInDate < end;
      });

    const totalMinutes = weekSessions.reduce((sum, session) => {
      if (session.duration) return sum + session.duration;
      if (session.checkIn && !session.checkOut) {
        const diff = Math.floor(
          (Date.now() - new Date(session.checkIn).getTime()) / 60000,
        );
        return sum + Math.max(diff, 0);
      }
      return sum;
    }, 0);

    const uniqueDays = new Set(
      weekSessions.map((session) => new Date(session.checkIn).toDateString()),
    );

    const onTimeCount = weekSessions.filter((session) => {
      const d = new Date(session.checkIn);
      return d.getHours() * 60 + d.getMinutes() <= shiftStartMinutes;
    }).length;

    const onTimePercent = weekSessions.length
      ? Math.round((onTimeCount / weekSessions.length) * 100)
      : 0;

    const avgHours = uniqueDays.size
      ? (totalMinutes / 60 / uniqueDays.size).toFixed(2)
      : "0.00";

    return {
      totalHours: (totalMinutes / 60).toFixed(2),
      avgHours,
      onTimePercent,
    };
  }, [attendance, shiftStartMinutes]);

  const leaveCreditByDate = useMemo(() => {
    const creditMap = new Map<
      string,
      { fraction: number; placement: "start" | "end" | "both"; unit: "full_day" | "half_day" | "partial_day" }
    >();
    for (const leave of approvedLeaves) {
      const leaveUnit = leave.leaveUnit || (leave.halfDay ? "half_day" : "full_day");
      const start = new Date(leave.fromDate);
      const end = new Date(leave.toDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) continue;

      const dailyFraction =
        leaveUnit === "half_day"
          ? 0.5
          : leaveUnit === "partial_day"
          ? Math.max(
              0,
              Math.min(
                1,
                Number(leave.partialMinutes || 0) / Math.max(1, shiftDurationMinutes),
              ),
            )
          : 1;
      const placement =
        leaveUnit === "full_day"
          ? "both"
          : leaveUnit === "half_day"
          ? leave.halfDaySession === "second_half"
            ? "end"
            : "start"
          : leave.partialDayPosition === "end"
          ? "end"
          : "start";

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toDateKey(d);
        const previous = creditMap.get(key);
        if (!previous || dailyFraction >= previous.fraction) {
          creditMap.set(key, {
            fraction: dailyFraction,
            placement,
            unit: leaveUnit as "full_day" | "half_day" | "partial_day",
          });
        }
      }
    }
    return creditMap;
  }, [approvedLeaves, shiftDurationMinutes]);

  const rangedLogs = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - range);
    return [...attendance]
      .filter((log) => new Date(log.checkIn) >= cutoff)
      .sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  }, [attendance, range]);

  const currentTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const currentDate = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  const employeeStatusChart = data.hr
    ? [
        {
          name: "Employees",
          Active: data.hr.stats.activeEmployees,
          Disabled: data.hr.stats.disabledEmployees,
        },
      ]
    : [];
  const activeBranches = (geofence?.branches || []).filter((branch) => branch.isActive);
  const displayBranch = matchedBranch || activeBranches[0] || null;
  const mapLat = geoCoords?.lat ?? 0;
  const mapLng = geoCoords?.lng ?? 0;
  const mapDelta = 0.01;
  const mapNorth = mapLat + mapDelta;
  const mapSouth = mapLat - mapDelta;
  const mapWest = mapLng - mapDelta;
  const mapEast = mapLng + mapDelta;
  const metersPerDegreeLng = 111320 * Math.cos((mapLat * Math.PI) / 180);
  const mapWidthMeters = Math.max(1, (mapEast - mapWest) * metersPerDegreeLng);

  const toMapPercent = (lat: number, lng: number) => {
    const left = ((lng - mapWest) / (mapEast - mapWest)) * 100;
    const top = ((mapNorth - lat) / (mapNorth - mapSouth)) * 100;
    return { left, top };
  };

  const userPoint = geoCoords ? toMapPercent(geoCoords.lat, geoCoords.lng) : null;
  const branchPoint = displayBranch
    ? toMapPercent(displayBranch.center.lat, displayBranch.center.lng)
    : null;
  const geofenceDiameterPercent = displayBranch
    ? (displayBranch.radiusMeters * 2 * 100) / mapWidthMeters
    : 0;

  const mapSrc =
    geoCoords
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapLng - mapDelta}%2C${mapLat - mapDelta}%2C${mapLng + mapDelta}%2C${mapLat + mapDelta}&layer=mapnik`
      : "";

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {data.user.name}</p>
          {data.user.createdAt && (
            <p className="text-xs text-gray-400 mt-1">
              Joined: {formatDate(data.user.createdAt)}
            </p>
          )}
        </div>
        {data.me && (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">My Workspace</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Attendance Stats
                  </h3>
                  <span className="text-xs text-gray-500">This Week</span>
                </div>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                    <div>
                      <div className="text-xs text-gray-500">Me</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {weekStats.totalHours} hrs
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">AVG HRS/DAY</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {weekStats.avgHours}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">ON TIME</div>
                      <div className="text-sm font-semibold text-emerald-600">
                        {weekStats.onTimePercent}%
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Based on check-ins before {formatShiftTime(shiftStartTime)}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Timings
                  </h3>
                  <span className="text-xs text-gray-500">
                    {formatShiftTime(shiftStartTime)} - {formatShiftTime(shiftEndTime)}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => {
                      const dayIndex = (new Date().getDay() + 6) % 7;
                      const isToday = index === dayIndex;
                      return (
                        <div
                          key={`${day}-${index}`}
                          className={`w-8 h-8 rounded-full text-xs flex items-center justify-center border ${
                            isToday
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-xs text-gray-500">Today</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatShiftTime(shiftStartTime)} - {formatShiftTime(shiftEndTime)}
                  </div>
                  <div className="mt-3 relative h-2.5 w-full rounded-full overflow-hidden bg-gray-100">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                      style={{ width: `${timingProgressPercent}%`, backgroundColor: timingFillColor }}
                    />
                    <div
                      className="absolute inset-y-0 rounded-sm"
                      style={{
                        left: `${lunchOffsetPercent}%`,
                        width: `${lunchWidthPercent}%`,
                        backgroundColor: "color-mix(in srgb, var(--card) 78%, var(--accent-500))",
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                    <span>
                      Break: {formatMinutesAsTime(lunchStartMinutes)} -{" "}
                      {formatMinutesAsTime(lunchEndMinutes)}
                    </span>
                    <span>{isClockedIn ? "On Duty" : "Logged Out"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Actions
                  </h3>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold text-gray-900">{currentTime}</div>
                  <div className="text-xs text-gray-500 mt-1">{currentDate}</div>
                  <div className="mt-2 text-xs text-indigo-700">
                    Regularization Balance: <span className="font-semibold">{regularizationBalance}</span>
                  </div>
                  <div className="mt-4">
                    {canClock ? (
                      <button
                        onClick={isClockedIn ? handleClockOut : handleClockIn}
                        disabled={clocking}
                        className={`w-full px-4 py-2 rounded-lg text-white ${
                          isClockedIn
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-blue-600 hover:bg-blue-700"
                        } ${clocking ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        {clocking
                          ? "Please wait..."
                          : isClockedIn
                          ? "Clock Out"
                          : "Web Clock-in"}
                      </button>
                    ) : (
                      <div className="text-sm text-gray-500">Clock-in unavailable</div>
                    )}
                  </div>
                  <div className="mt-4 text-xs text-blue-600 space-y-1">
                    <div className="cursor-pointer hover:underline">Forgot ID</div>
                    <div className="cursor-pointer hover:underline">Remote Clock-in</div>
                    <div className="cursor-pointer hover:underline">Work From Home</div>
                    <div className="cursor-pointer hover:underline">
                      Attendance Policy
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Logs</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Current Status: {isClockedIn ? "In Office" : "Off Duty"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {[7, 30, 90].map((value) => (
                    <button
                      key={value}
                      onClick={() => setRange(value as RangeOption)}
                      className={`px-3 py-1 text-xs rounded-md border ${
                        range === value
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200"
                      }`}
                    >
                      {value} Days
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                {rangedLogs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No entries logged yet.
                  </p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Attendance Visual
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Effective Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Gross Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Arrival
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Log
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rangedLogs.map((log, index) => {
                        const sessions = log.sessions || [];
                        const computedDuration = sessions.length
                          ? sessions.reduce((sum, session) => {
                              if (session.duration) return sum + session.duration;
                              if (session.checkIn && session.checkOut) {
                                return (
                                  sum +
                                  Math.max(
                                    0,
                                    Math.floor(
                                      (new Date(session.checkOut).getTime() -
                                        new Date(session.checkIn).getTime()) /
                                        60000,
                                    ),
                                  )
                                );
                              }
                              if (session.checkIn && !session.checkOut) {
                                return (
                                  sum +
                                  Math.max(
                                    0,
                                    Math.floor(
                                      (Date.now() -
                                        new Date(session.checkIn).getTime()) /
                                        60000,
                                    ),
                                  )
                                );
                              }
                              return sum;
                            }, 0)
                          : log.duration || 0;
                        const durationMinutes = computedDuration;
                        const firstCheckIn = sessions.length
                          ? sessions[0].checkIn
                          : log.checkIn;
                        const leaveInfo = leaveCreditByDate.get(toDateKey(new Date(firstCheckIn)));
                        const leaveCreditMinutes = Math.round(
                          (leaveInfo?.fraction || 0) * shiftDurationMinutes,
                        );
                        const firstCheckInDate = new Date(firstCheckIn);
                        const checkInMinutesOfDay =
                          firstCheckInDate.getHours() * 60 + firstCheckInDate.getMinutes();
                        const checkInOffsetPercent = Math.min(
                          100,
                          Math.max(
                            0,
                            Math.round(
                              ((checkInMinutesOfDay - shiftStartMinutes) / shiftDurationMinutes) * 100,
                            ),
                          ),
                        );
                        const workedRawPercent = Math.min(
                          100,
                          Math.max(0, Math.round((durationMinutes / shiftDurationMinutes) * 100)),
                        );
                        const workedPercent = Math.max(
                          0,
                          Math.min(100 - checkInOffsetPercent, workedRawPercent),
                        );
                        const workedEndPercent = Math.min(
                          100,
                          Math.max(0, checkInOffsetPercent + workedPercent),
                        );
                        const leavePercent = Math.min(
                          100,
                          Math.max(0, Math.round((leaveCreditMinutes / shiftDurationMinutes) * 100)),
                        );
                        const lastCheckOut = sessions.length
                          ? sessions[sessions.length - 1].checkOut
                          : log.checkOut;
                        const checkInDate = new Date(firstCheckIn);
                        const computedLateMinutes = Math.max(
                          0,
                          checkInDate.getHours() * 60 + checkInDate.getMinutes() - shiftStartMinutes,
                        );
                        const lateMinutes =
                          typeof log.lateMinutes === "number"
                            ? Math.max(0, log.lateMinutes)
                            : computedLateMinutes;
                        const isHalfDayLeave = leaveInfo?.unit === "half_day";
                        const hasPenalty =
                          isHalfDayLeave
                            ? false
                            : typeof log.hasPenalty === "boolean"
                            ? log.hasPenalty
                            : lateMinutes > PENALTY_LATE_MINUTES;
                        const arrivalStatus = isHalfDayLeave
                          ? { label: "Half Day Leave", className: "bg-blue-100 text-blue-700" }
                          : resolveArrivalStatus(lateMinutes, hasPenalty, false);
                        const rowDate = toDateKey(new Date(firstCheckIn));
                        const rowMenuKey = log._id || `${rowDate}-${index}`;
                        return (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(firstCheckIn)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="relative w-56 h-8">
                                <div className="absolute inset-x-0 top-0 h-5">
                                  {Array.from({ length: 21 }).map((_, tickIndex) => (
                                    <span
                                      key={tickIndex}
                                      className="absolute top-0 h-5 w-px bg-gray-300/90"
                                      style={{ left: `${(tickIndex / 20) * 100}%` }}
                                    />
                                  ))}
                                </div>
                                <div className="absolute inset-x-0 top-1.5 h-3 rounded-full bg-gray-200" />
                                {leavePercent > 0 && leaveInfo?.placement === "both" && (
                                  <div
                                    className="absolute top-1.5 h-3 rounded-full"
                                    style={{
                                      left: "0%",
                                      width: "100%",
                                      backgroundColor: "color-mix(in srgb, var(--accent-500) 82%, black)",
                                    }}
                                    title="Approved full-day leave credit"
                                  />
                                )}
                                {leavePercent > 0 && leaveInfo?.placement === "start" && (
                                  <div
                                    className="absolute top-1.5 h-3 rounded-l-full"
                                    style={{
                                      left: "0%",
                                      width: `${leavePercent}%`,
                                      backgroundColor: "color-mix(in srgb, var(--accent-500) 82%, black)",
                                    }}
                                    title="Approved leave credit (Shift Start)"
                                  />
                                )}
                                {leavePercent > 0 && leaveInfo?.placement === "end" && (
                                  <div
                                    className="absolute top-1.5 h-3 rounded-r-full"
                                    style={{
                                      right: "0%",
                                      width: `${leavePercent}%`,
                                      backgroundColor: "color-mix(in srgb, var(--accent-500) 82%, black)",
                                    }}
                                    title="Approved leave credit (Shift End)"
                                  />
                                )}
                                {workedPercent > 0 && (
                                  <div
                                    className="absolute top-1.5 h-3 rounded-full"
                                    style={{
                                      left: `${checkInOffsetPercent}%`,
                                      width: `${workedPercent}%`,
                                      backgroundColor: lastCheckOut
                                        ? "color-mix(in srgb, var(--accent-500) 38%, white)"
                                        : "var(--accent-500)",
                                    }}
                                    title="Worked time"
                                  />
                                )}
                                {workedPercent > 0 && (
                                  <>
                                    <span
                                      className="absolute top-6 -translate-x-1/2 h-0 w-0 border-l-[9px] border-r-[9px] border-t-0 border-b-[11px] border-l-transparent border-r-transparent border-b-gray-300"
                                      style={{ left: `${checkInOffsetPercent}%` }}
                                    />
                                    <span
                                      className="absolute top-6 -translate-x-1/2 h-0 w-0 border-l-[9px] border-r-[9px] border-t-0 border-b-[11px] border-l-transparent border-r-transparent border-b-gray-300"
                                      style={{ left: `${workedEndPercent}%` }}
                                    />
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {durationMinutes
                                ? `${Math.floor(durationMinutes / 60)}h ${
                                    durationMinutes % 60
                                  }m`
                                : "-"}
                              {leaveCreditMinutes > 0 && (
                                <div className="text-xs text-blue-600">
                                  +{Math.floor(leaveCreditMinutes / 60)}h {leaveCreditMinutes % 60}m
                                  {" "}leave credit
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(shiftDurationMinutes / 60).toFixed(2)} hrs
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {log.isRegularized ? (
                                <span
                                  title="Regularized"
                                  className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700"
                                >
                                  R
                                </span>
                              ) : (
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${arrivalStatus.className}`}
                                >
                                  {arrivalStatus.label}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatTime(firstCheckIn)} -
                              {lastCheckOut ? ` ${formatTime(lastCheckOut)}` : " --"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {canRegularize ? (
                                <div className="relative inline-block" data-log-menu-root="true">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      if (activeLogMenuKey === rowMenuKey) {
                                        setActiveLogMenuKey(null);
                                        setActiveLogMenuPosition(null);
                                        setActiveLogMenuContext(null);
                                        return;
                                      }
                                      const rect = (
                                        event.currentTarget as HTMLButtonElement
                                      ).getBoundingClientRect();
                                      const openUp = window.innerHeight - rect.bottom < 120;
                                      setActiveLogMenuKey(rowMenuKey);
                                      setActiveLogMenuPosition({
                                        top: openUp ? rect.top - 8 : rect.bottom + 8,
                                        left: rect.right - 176,
                                        openUp,
                                      });
                                      setActiveLogMenuContext({
                                        date: rowDate,
                                        checkIn: toInputTime(firstCheckIn),
                                        checkOut: toInputTime(lastCheckOut || undefined),
                                      });
                                    }}
                                    className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                                  >
                                    ...
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {canRegularize && (
              <div className="bg-white rounded-xl shadow">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Regularization Requests</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Both options use the same balance. Status is tracked here.
                    </p>
                  </div>
                  <div className="text-xs text-indigo-700 font-semibold">
                    Balance: {regularizationBalance}
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                  {myRegularizationRequests.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No regularization requests yet.</p>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Requested Log
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {myRegularizationRequests.map((request) => (
                          <tr key={request._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(request.date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">
                              {request.type === "penalty" ? "Regularize" : "Regularize Logs"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {request.type === "logs"
                                ? `${request.requestedCheckIn ? formatTime(request.requestedCheckIn) : "--"} - ${
                                    request.requestedCheckOut ? formatTime(request.requestedCheckOut) : "--"
                                  }`
                                : "Penalty remove"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                  request.status === "approved"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : request.status === "rejected"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {request.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">My Tasks</h3>
              </div>
              <div className="p-6">
                {tickets.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No tasks assigned yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {tickets.slice(0, 5).map((ticket) => (
                      <div
                        key={ticket._id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">
                              {ticket.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {ticket.description}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Created: {formatDate(ticket.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              ticket.status,
                            )}`}
                          >
                            {ticket.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
        {data.admin && (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Admin Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Total Users</div>
                <div className="text-2xl font-bold text-gray-900">
                  {data.admin.stats.totalUsers}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Total Tickets</div>
                <div className="text-2xl font-bold text-gray-900">
                  {data.admin.stats.totalTickets}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Pending</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {data.admin.stats.pendingTickets}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">In Progress</div>
                <div className="text-2xl font-bold text-blue-600">
                  {data.admin.stats.startedTickets}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Completed</div>
                <div className="text-2xl font-bold text-green-600">
                  {data.admin.stats.completedTickets}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Tickets</h3>
              </div>
              <div className="p-6">
                {data.admin.recentTickets.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No tickets yet.</p>
                ) : (
                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Title
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Assigned To
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.admin.recentTickets.map((ticket) => (
                          <tr key={ticket._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {ticket.title}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {ticket.assignedTo?.name || "Unassigned"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                  ticket.status,
                                )}`}
                              >
                                {ticket.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
        {data.hr && (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">HR Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Total Employees</div>
                <div className="text-2xl font-bold text-black">
                  {data.hr.stats.totalEmployees}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Active</div>
                <div className="text-2xl font-bold text-green-600">
                  {data.hr.stats.activeEmployees}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Disabled</div>
                <div className="text-2xl font-bold text-red-600">
                  {data.hr.stats.disabledEmployees}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg text-black font-semibold mb-4">
                Employee Status Overview
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={employeeStatusChart}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="Active" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Disabled" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg text-black font-semibold">Attendance</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                <div className="lg:col-span-1 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700">Employees</h4>
                  </div>
                  <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {data.hr.attendanceEmployees.map((emp) => (
                      <button
                        key={emp._id}
                        onClick={() => setSelectedEmployee(emp)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedEmployee?._id === emp._id
                            ? "bg-blue-100 border-2 border-blue-500"
                            : "bg-white hover:bg-gray-100 border border-transparent"
                        }`}
                      >
                        <div className="font-medium text-gray-900">
                          {emp.name || "Employee"}
                        </div>
                        <div className="text-sm text-gray-600">{emp.email || ""}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {emp.attendanceLogs?.length || 0} records
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700">
                      {selectedEmployee
                        ? `${selectedEmployee.name}'s Attendance`
                        : "Select an employee"}
                    </h4>
                  </div>
                  <div className="p-4">
                    {selectedEmployee ? (
                      (selectedEmployee.attendanceLogs || []).length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                          No entries logged.
                        </p>
                      ) : (
                        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Check In
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Check Out
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Duration
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Arrival
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(selectedEmployee.attendanceLogs || []).map((log, index) => (
                                <tr key={index}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(log.checkIn).toLocaleDateString(
                                      "en-US",
                                      {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      },
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(log.checkIn).toLocaleTimeString("en-US", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {log.checkOut
                                      ? new Date(log.checkOut).toLocaleTimeString(
                                          "en-US",
                                          { hour: "2-digit", minute: "2-digit" },
                                        )
                                      : "-"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {log.duration
                                      ? `${Math.floor(log.duration / 60)}h ${
                                          log.duration % 60
                                        }m`
                                      : "-"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {(() => {
                                      const selectedShiftStart = SHIFT_TIME_PATTERN.test(
                                        selectedEmployee.shift?.startTime || "",
                                      )
                                        ? (selectedEmployee.shift?.startTime as string)
                                        : DEFAULT_SHIFT_START;
                                      const selectedShiftStartMinutes = toMinutes(selectedShiftStart);
                                      const checkInDate = new Date(log.checkIn);
                                      const computedLateMinutes = Math.max(
                                        0,
                                        checkInDate.getHours() * 60 +
                                          checkInDate.getMinutes() -
                                          selectedShiftStartMinutes,
                                      );
                                      const lateMinutes =
                                        typeof log.lateMinutes === "number"
                                          ? Math.max(0, log.lateMinutes)
                                          : computedLateMinutes;
                                      const hasPenalty =
                                        typeof log.hasPenalty === "boolean"
                                          ? log.hasPenalty
                                          : lateMinutes > PENALTY_LATE_MINUTES;
                                      const arrivalStatus = resolveArrivalStatus(
                                        lateMinutes,
                                        hasPenalty,
                                      );
                                      return (
                                        <>
                                          {log.isRegularized ? (
                                            <span
                                              title="Regularized"
                                              className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700"
                                            >
                                              R
                                            </span>
                                          ) : (
                                          <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${arrivalStatus.className}`}
                                          >
                                            {arrivalStatus.label}
                                          </span>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        Select an employee to view details.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {canReviewRegularization && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg text-black font-semibold">Regularization Requests</h3>
                </div>
                <div className="p-6">
                  {hrRegularizationRequests.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No regularization requests.</p>
                  ) : (
                    <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Employee
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {hrRegularizationRequests.map((request) => (
                            <tr key={request._id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {request.user?.name || "Employee"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(request.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">
                                {request.type === "penalty" ? "Regularize" : "Regularize Logs"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                    request.status === "approved"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : request.status === "rejected"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {request.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {request.status === "pending" ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={regularizationActionLoading === request._id}
                                      onClick={() =>
                                        handleReviewRegularization(request._id, "approve")
                                      }
                                      className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-60"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      disabled={regularizationActionLoading === request._id}
                                      onClick={() =>
                                        handleReviewRegularization(request._id, "reject")
                                      }
                                      className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700 disabled:opacity-60"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500">Reviewed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
      {canRegularize && activeLogMenuKey && activeLogMenuPosition && activeLogMenuContext && (
        <div
          data-log-floating-menu="true"
          className="fixed z-[80] w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
          style={{
            left: `${Math.max(8, activeLogMenuPosition.left)}px`,
            top: activeLogMenuPosition.openUp
              ? `${Math.max(8, activeLogMenuPosition.top - 84)}px`
              : `${activeLogMenuPosition.top}px`,
          }}
        >
          <button
            type="button"
            disabled={regularizationBalance <= 0}
            onClick={() =>
              openRegularizeFromLog("penalty", activeLogMenuContext.date)
            }
            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            Regularize
          </button>
          <button
            type="button"
            disabled={regularizationBalance <= 0}
            onClick={() =>
              openRegularizeFromLog(
                "logs",
                activeLogMenuContext.date,
                activeLogMenuContext.checkIn,
                activeLogMenuContext.checkOut,
              )
            }
            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            Regularize Logs
          </button>
        </div>
      )}
      <Modal
        open={regularizeModalOpen}
        title="Regularize"
        description="Use this to request penalty removal for a day."
        onClose={() => setRegularizeModalOpen(false)}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={regularizeDate}
              onChange={(e) => setRegularizeDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Reason (optional)</label>
            <textarea
              rows={3}
              value={regularizeReason}
              onChange={(e) => setRegularizeReason(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Why should this penalty be removed?"
            />
          </div>
          <div className="text-xs text-indigo-700">Remaining balance: {regularizationBalance}</div>
          <button
            type="button"
            disabled={regularizationSubmitting || regularizationBalance <= 0 || !regularizeDate}
            onClick={handleRegularizePenalty}
            className={`w-full rounded-lg px-4 py-2 text-sm font-medium text-white ${
              regularizationSubmitting || regularizationBalance <= 0 || !regularizeDate
                ? "cursor-not-allowed bg-gray-300 text-gray-500"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {regularizationSubmitting ? "Submitting..." : "Submit Regularization"}
          </button>
        </div>
      </Modal>
      <Modal
        open={regularizeLogsModalOpen}
        title="Regularize Logs"
        description="Use this when check-in/out logs are missing or incomplete."
        onClose={() => setRegularizeLogsModalOpen(false)}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={regularizeDate}
              onChange={(e) => setRegularizeDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start Log</label>
              <input
                type="time"
                value={regularizeLogCheckIn}
                onChange={(e) => setRegularizeLogCheckIn(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">End Log</label>
              <input
                type="time"
                value={regularizeLogCheckOut}
                onChange={(e) => setRegularizeLogCheckOut(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Reason (optional)</label>
            <textarea
              rows={3}
              value={regularizeReason}
              onChange={(e) => setRegularizeReason(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Explain the missing/incorrect logs."
            />
          </div>
          <div className="text-xs text-indigo-700">Remaining balance: {regularizationBalance}</div>
          <button
            type="button"
            disabled={
              regularizationSubmitting ||
              regularizationBalance <= 0 ||
              !regularizeDate ||
              (!regularizeLogCheckIn && !regularizeLogCheckOut)
            }
            onClick={handleRegularizeLogs}
            className={`w-full rounded-lg px-4 py-2 text-sm font-medium text-white ${
              regularizationSubmitting ||
              regularizationBalance <= 0 ||
              !regularizeDate ||
              (!regularizeLogCheckIn && !regularizeLogCheckOut)
                ? "cursor-not-allowed bg-gray-300 text-gray-500"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {regularizationSubmitting ? "Submitting..." : "Submit Log Regularization"}
          </button>
        </div>
      </Modal>
      <Modal
        open={locationModalOpen}
        title={locationAction === "clockIn" ? "Clock In with Location" : "Clock Out with Location"}
        description="Location verification is required to continue."
        onClose={() => setLocationModalOpen(false)}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
            {geoChecking ? "Detecting your location..." : geoMessage}
          </div>
          {geoCoords && (
            <div className="text-xs text-gray-500">
              Your location: {geoCoords.lat.toFixed(6)}, {geoCoords.lng.toFixed(6)} • Accuracy{" "}
              {Math.round(geoCoords.accuracy)}m
            </div>
          )}
          {displayBranch && (
            <div className="text-xs text-gray-500">
              Branch: {displayBranch.name} • Radius {Math.round(displayBranch.radiusMeters)}m
              {geoDistance !== null ? ` • Distance ${geoDistance}m` : ""}
            </div>
          )}
          {mapSrc && (
            <div className="relative overflow-hidden rounded-lg border border-gray-200">
              <iframe
                title="Location Map"
                src={mapSrc}
                className="h-52 w-full"
                loading="lazy"
              />
              {branchPoint && (
                <>
                  <div
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-500/70 bg-blue-500/15"
                    style={{
                      left: `${branchPoint.left}%`,
                      top: `${branchPoint.top}%`,
                      width: `${geofenceDiameterPercent}%`,
                      height: `${geofenceDiameterPercent}%`,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-blue-600 ring-2 ring-white"
                    style={{ left: `${branchPoint.left}%`, top: `${branchPoint.top}%` }}
                  />
                </>
              )}
              {userPoint && (
                <div
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"
                  style={{ left: `${userPoint.left}%`, top: `${userPoint.top}%` }}
                />
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => requestCurrentLocation(locationAction)}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Fetch My Location
            </button>
            <button
              type="button"
              disabled={clocking || geoChecking || !geoAllowed}
              onClick={() => performClockAction(locationAction, geoCoords)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                clocking || geoChecking || !geoAllowed
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {clocking
                ? "Please wait..."
                : locationAction === "clockIn"
                ? "Confirm Clock In"
                : "Confirm Clock Out"}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
