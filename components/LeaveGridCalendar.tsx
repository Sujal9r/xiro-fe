"use client";

import { useMemo } from "react";

export interface LeaveGridRequest {
  _id: string;
  employee?: { name: string; email?: string };
  typeName: string;
  fromDate: string;
  toDate: string;
  halfDay?: boolean;
  leaveUnit?: "full_day" | "half_day" | "partial_day";
  halfDaySession?: "first_half" | "second_half" | "";
  partialMinutes?: number;
  partialDayPosition?: "start" | "end" | "";
  status: string;
}

interface LeaveGridCalendarProps {
  title?: string;
  monthValue: string;
  onMonthChange: (value: string) => void;
  requests: LeaveGridRequest[];
  emptyMessage?: string;
}

const hashCode = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const LEAVE_TYPE_PALETTE = ["#7c3aed", "#0ea5e9", "#6b7280", "#eab308"];

const leaveTypeColor = (typeName: string) => {
  return LEAVE_TYPE_PALETTE[hashCode(typeName) % LEAVE_TYPE_PALETTE.length];
};

export default function LeaveGridCalendar({
  title = "Leave Calendar",
  monthValue,
  onMonthChange,
  requests,
  emptyMessage = "No approved leaves.",
}: LeaveGridCalendarProps) {
  const monthDays = useMemo(() => {
    const [year, month] = monthValue.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = new Date(year, month - 1, day);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      return { day, isWeekend };
    });
  }, [monthValue]);

  const calendarRows = useMemo(() => {
    const grouped = requests.reduce<Record<string, LeaveGridRequest[]>>((acc, req) => {
      const key = req.employee?.name || "Employee";
      acc[key] = acc[key] || [];
      acc[key].push(req);
      return acc;
    }, {});
    return Object.entries(grouped);
  }, [requests]);

  const leaveTypeLegend = useMemo(() => {
    const uniqueTypes = Array.from(
      new Set(requests.map((req) => req.typeName).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
    return uniqueTypes.map((typeName) => ({
      typeName,
      color: leaveTypeColor(typeName),
    }));
  }, [requests]);

  const getLeaveFill = (entry: LeaveGridRequest, baseColor: string) => {
    const leaveUnit = entry.leaveUnit || (entry.halfDay ? "half_day" : "full_day");
    if (leaveUnit === "half_day") {
      const firstHalf = entry.halfDaySession !== "second_half";
      return firstHalf
        ? `linear-gradient(to right, ${baseColor} 50%, #f9fafb 50%)`
        : `linear-gradient(to right, #f9fafb 50%, ${baseColor} 50%)`;
    }
    if (leaveUnit === "partial_day") {
      const partialPercent = Math.max(
        0,
        Math.min(100, Math.round(((entry.partialMinutes || 0) / 480) * 100)),
      );
      if (partialPercent <= 0) return "#f9fafb";
      return entry.partialDayPosition === "end"
        ? `linear-gradient(to right, #f9fafb ${100 - partialPercent}%, ${baseColor} ${100 - partialPercent}%)`
        : `linear-gradient(to right, ${baseColor} ${partialPercent}%, #f9fafb ${partialPercent}%)`;
    }
    return baseColor;
  };

  const getLeaveTitle = (entry: LeaveGridRequest) => {
    const leaveUnit = entry.leaveUnit || (entry.halfDay ? "half_day" : "full_day");
    if (leaveUnit === "half_day") {
      return `${entry.typeName} • ${
        entry.halfDaySession === "second_half"
          ? "2nd Half (Shift End)"
          : "1st Half (Shift Start)"
      }`;
    }
    if (leaveUnit === "partial_day") {
      return `${entry.typeName} • Partial (${entry.partialMinutes || 0} min, ${
        entry.partialDayPosition === "end" ? "Shift End" : "Shift Start"
      })`;
    }
    return `${entry.typeName} • Full Day`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <input
          type="month"
          value={monthValue}
          onChange={(e) => onMonthChange(e.target.value)}
          className="w-full md:w-48 rounded-md border border-gray-200 p-2 text-black"
        />
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-225">
          <div className="grid grid-cols-[220px_repeat(31,minmax(24px,1fr))] gap-1 text-xs text-gray-500 mb-2">
            <div className="font-semibold text-gray-600">Employee</div>
            {monthDays.map((dayMeta) => (
              <div
                key={dayMeta.day}
                className={`text-center ${
                  dayMeta.isWeekend ? "rounded-md bg-gray-400 text-gray-600" : ""
                }`}
                title={dayMeta.isWeekend ? "Weekend Off" : undefined}
              >
                {dayMeta.day}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {calendarRows.map(([name, leaves]) => (
              <div
                key={name}
                className="grid grid-cols-[220px_repeat(31,minmax(24px,1fr))] gap-1 items-center"
              >
                <div className="text-sm font-medium text-gray-900">{name}</div>
                {monthDays.map((dayMeta) => {
                  const date = new Date(
                    `${monthValue}-${String(dayMeta.day).padStart(2, "0")}`,
                  );
                  const entry = leaves.find((req) => {
                    const from = new Date(req.fromDate);
                    const to = new Date(req.toDate);
                    from.setHours(0, 0, 0, 0);
                    to.setHours(0, 0, 0, 0);
                    date.setHours(0, 0, 0, 0);
                    return date >= from && date <= to;
                  });
                  if (dayMeta.isWeekend) {
                    return (
                      <div
                        key={dayMeta.day}
                        className="h-6 rounded-md bg-blue-50"
                        title="Weekend Off"
                      />
                    );
                  }
                  if (!entry) {
                    return <div key={dayMeta.day} className="h-6 rounded-md bg-gray-50" />;
                  }
                  const cellColor = leaveTypeColor(entry.typeName || "Leave");
                  return (
                    <div
                      key={dayMeta.day}
                      className="h-6 rounded-md"
                      style={{
                        background: getLeaveFill(entry, cellColor),
                      }}
                      title={getLeaveTitle(entry)}
                    />
                  );
                })}
              </div>
            ))}
            {calendarRows.length === 0 && (
              <div className="text-sm text-gray-500">{emptyMessage}</div>
            )}
          </div>
        </div>
      </div>
      {leaveTypeLegend.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Leave Type 
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {leaveTypeLegend.map((item) => (
              <div key={item.typeName} className="flex items-center gap-2 text-xs text-gray-700">
                <span
                  className="h-3 w-3 rounded-sm border border-gray-200"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.typeName}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <span
                className="h-3 w-3 rounded-sm border border-gray-200"
                style={{
                  background:
                    "linear-gradient(to right, #9ca3af 50%, #f9fafb 50%)",
                }}
              />
              <span>1st Half</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <span
                className="h-3 w-3 rounded-sm border border-gray-200"
                style={{
                  background:
                    "linear-gradient(to right, #f9fafb 50%, #9ca3af 50%)",
                }}
              />
              <span>2nd Half</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <span
                className="h-3 w-3 rounded-sm border border-gray-200"
                style={{
                  background:
                    "linear-gradient(to right, #9ca3af 12.5%, #f9fafb 12.5%)",
                }}
              />
              <span>Partial Day (0-60 min)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
