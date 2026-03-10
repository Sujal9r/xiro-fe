"use client";

import { useMemo } from "react";

export interface LeaveTimelineRequest {
  _id: string;
  employee?: { name: string; email?: string };
  typeName: string;
  fromDate: string;
  toDate: string;
  halfDay?: boolean;
  status: string;
}

type EmployeeRow = {
  key: string;
  name: string;
  email?: string;
  requests: LeaveTimelineRequest[];
};

interface LeaveTimelineCalendarProps {
  monthCursor: Date;
  requests: LeaveTimelineRequest[];
  onMoveMonth: (offset: number) => void;
  emptyMessage?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const COLORS = [
  { solid: "#f59e0b", soft: "rgba(245,158,11,0.28)" },
  { solid: "#8b5cf6", soft: "rgba(139,92,246,0.28)" },
  { solid: "#14b8a6", soft: "rgba(20,184,166,0.28)" },
  { solid: "#3b82f6", soft: "rgba(59,130,246,0.28)" },
  { solid: "#ef4444", soft: "rgba(239,68,68,0.28)" },
];

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const inRange = (target: Date, req: LeaveTimelineRequest) => {
  const d = startOfDay(target).getTime();
  const from = startOfDay(new Date(req.fromDate)).getTime();
  const to = startOfDay(new Date(req.toDate)).getTime();
  return d >= from && d <= to;
};

const addDays = (date: Date, offset: number) => new Date(date.getTime() + offset * DAY_MS);

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const hashCode = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const leaveColor = (req: LeaveTimelineRequest) =>
  COLORS[hashCode(req.typeName || req._id) % COLORS.length];

export default function LeaveTimelineCalendar({
  monthCursor,
  requests,
  onMoveMonth,
  emptyMessage = "No leave data for this month.",
}: LeaveTimelineCalendarProps) {
  const monthDays = useMemo(() => {
    const daysInMonth = new Date(
      monthCursor.getFullYear(),
      monthCursor.getMonth() + 1,
      0,
    ).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), i + 1);
      return {
        date,
        dayNumber: i + 1,
        weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
      };
    });
  }, [monthCursor]);

  const employeeRows = useMemo(() => {
    const grouped = requests.reduce<Record<string, EmployeeRow>>((acc, req) => {
      const name = req.employee?.name || "Employee";
      const email = req.employee?.email || "";
      const key = `${name}__${email || "unknown"}`;
      if (!acc[key]) {
        acc[key] = { key, name, email, requests: [] };
      }
      acc[key].requests.push(req);
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  }, [requests]);

  const monthLabel = monthCursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onMoveMonth(-1)}
            className="h-10 w-10 rounded-lg bg-blue-600 text-white text-xl leading-none hover:bg-blue-700"
            aria-label="Previous month"
          >
            ‹
          </button>
          <h2 className="text-4xl font-light text-gray-800">{monthLabel}</h2>
          <button
            type="button"
            onClick={() => onMoveMonth(1)}
            className="h-10 w-10 rounded-lg bg-blue-600 text-white text-xl leading-none hover:bg-blue-700"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[1200px] space-y-2">
          <div
            className="grid items-center gap-2 text-gray-500"
            style={{
              gridTemplateColumns: `240px repeat(${monthDays.length}, minmax(46px, 1fr))`,
            }}
          >
            <div />
            {monthDays.map((day) => (
              <div key={`head-${day.dayNumber}`} className="text-center text-sm font-medium">
                {day.weekday.slice(0, 2)}
              </div>
            ))}
          </div>

          {employeeRows.map((row) => (
            <div
              key={row.key}
              className="grid items-center gap-2"
              style={{
                gridTemplateColumns: `240px repeat(${monthDays.length}, minmax(46px, 1fr))`,
              }}
            >
              <div className="flex items-center gap-3 pr-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 text-gray-700 text-sm font-semibold flex items-center justify-center">
                  {getInitials(row.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-2xl font-normal text-gray-800">{row.name}</div>
                </div>
              </div>

              {monthDays.map((day) => {
                const req = row.requests.find((item) => inRange(day.date, item));
                if (!req) {
                  return (
                    <div
                      key={`${row.key}-${day.dayNumber}`}
                      className="h-10 flex items-center justify-center text-3xl font-light text-gray-400"
                    >
                      {day.dayNumber}
                    </div>
                  );
                }

                const prevSame = row.requests.some(
                  (item) => item._id === req._id && inRange(addDays(day.date, -1), item),
                );
                const nextSame = row.requests.some(
                  (item) => item._id === req._id && inRange(addDays(day.date, 1), item),
                );
                const colors = leaveColor(req);

                return (
                  <div key={`${row.key}-${day.dayNumber}`} className="h-10 px-[1px]">
                    <div
                      className="h-full flex items-center justify-center"
                      style={{
                        backgroundColor: colors.soft,
                        borderTopLeftRadius: prevSame ? 0 : 9999,
                        borderBottomLeftRadius: prevSame ? 0 : 9999,
                        borderTopRightRadius: nextSame ? 0 : 9999,
                        borderBottomRightRadius: nextSame ? 0 : 9999,
                      }}
                    >
                      <div
                        className="h-10 w-10 rounded-full text-white text-3xl font-light flex items-center justify-center"
                        style={{ backgroundColor: colors.solid }}
                        title={`${req.typeName}${req.halfDay ? " (Half Day)" : ""}`}
                      >
                        {day.dayNumber}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {employeeRows.length === 0 && (
            <div className="py-10 text-center text-gray-500">{emptyMessage}</div>
          )}
        </div>
      </div>
    </div>
  );
}
