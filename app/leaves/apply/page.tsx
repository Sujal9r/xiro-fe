"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import LeavesNav from "../../../components/LeavesNav";
import apiCall from "../../../lib/api";
import { useAlert } from "../../../components/AlertProvider";

interface LeaveType {
  key: string;
  name: string;
  yearlyLimit: number;
  allowHalfDay: boolean;
}

type LeaveUnit = "full_day" | "half_day" | "partial_day";

const LEAVE_UNIT_LABEL: Record<LeaveUnit, string> = {
  full_day: "Full Day",
  half_day: "Half Day",
  partial_day: "Partial Day",
};

const STANDARD_WORKDAY_MINUTES = 8 * 60;

const hasWeekendInRange = (fromDate: string, toDate: string) => {
  if (!fromDate || !toDate) return false;
  const start = new Date(fromDate);
  const end = new Date(toDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 0 || day === 6) return true;
  }
  return false;
};

export default function ApplyLeavePage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState({
    typeKey: "",
    fromDate: "",
    toDate: "",
    isMultiDay: false,
    leaveUnit: "full_day" as LeaveUnit,
    halfDaySession: "first_half" as "first_half" | "second_half",
    partialMinutes: 0,
    partialDayPosition: "start" as "start" | "end",
    reason: "",
    attachmentUrl: "",
  });

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const policy = await apiCall("/api/leaves/policy");
      setLeaveTypes(policy.leaveTypes || []);
      if (policy.leaveTypes?.length) {
        setFormData((prev) => ({ ...prev, typeKey: policy.leaveTypes[0].key }));
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const totalDays = useMemo(() => {
    if (!formData.fromDate) return 0;
    const effectiveToDate = formData.isMultiDay ? formData.toDate : formData.fromDate;
    if (!effectiveToDate) return 0;
    const start = new Date(formData.fromDate);
    const end = new Date(effectiveToDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const days = diff + 1;
    if (formData.leaveUnit === "half_day") {
      return 0.5;
    }
    if (formData.leaveUnit === "partial_day") {
      return Math.max(
        0,
        Math.round((Number(formData.partialMinutes || 0) / STANDARD_WORKDAY_MINUTES) * 1000) /
          1000,
      );
    }
    return Math.max(1, days);
  }, [
    formData.fromDate,
    formData.toDate,
    formData.isMultiDay,
    formData.leaveUnit,
    formData.partialMinutes,
  ]);

  const selectedType = leaveTypes.find((type) => type.key === formData.typeKey);
  const hasWeekendSelection = useMemo(
    () =>
      hasWeekendInRange(
        formData.fromDate,
        formData.isMultiDay ? formData.toDate : formData.fromDate,
      ),
    [formData.fromDate, formData.toDate, formData.isMultiDay],
  );

  const isSingleDateUnit =
    formData.leaveUnit === "half_day" || formData.leaveUnit === "partial_day";

  useEffect(() => {
    if (isSingleDateUnit && formData.isMultiDay) {
      setFormData((prev) => ({ ...prev, isMultiDay: false, toDate: prev.fromDate }));
    }
  }, [isSingleDateUnit, formData.isMultiDay, formData.fromDate]);

  useEffect(() => {
    if (!selectedType?.allowHalfDay && formData.leaveUnit === "half_day") {
      setFormData((prev) => ({ ...prev, leaveUnit: "full_day" }));
    }
  }, [selectedType?.allowHalfDay, formData.leaveUnit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.leaveUnit !== "partial_day" && !formData.typeKey) {
      showAlert("Please select leave type");
      return;
    }
    if (hasWeekendSelection) {
      showAlert("Saturday and Sunday are off days. Please select weekdays only.");
      return;
    }
    setSubmitting(true);
    try {
      await apiCall("/api/leaves/apply", {
        method: "POST",
        body: JSON.stringify({
          typeKey: formData.leaveUnit === "partial_day" ? "partial_day" : formData.typeKey,
          fromDate: formData.fromDate,
          toDate: formData.isMultiDay ? formData.toDate : formData.fromDate,
          leaveUnit: formData.leaveUnit,
          halfDaySession: formData.leaveUnit === "half_day" ? formData.halfDaySession : "",
          partialMinutes:
            formData.leaveUnit === "partial_day" ? Number(formData.partialMinutes || 0) : 0,
          partialDayPosition:
            formData.leaveUnit === "partial_day" ? formData.partialDayPosition : "",
          reason: formData.reason,
          attachmentUrl: formData.attachmentUrl,
        }),
      });
      setFormData({
        typeKey: leaveTypes[0]?.key || "",
        fromDate: "",
        toDate: "",
        isMultiDay: false,
        leaveUnit: "full_day",
        halfDaySession: "first_half",
        partialMinutes: 0,
        partialDayPosition: "start",
        reason: "",
        attachmentUrl: "",
      });
      showAlert("Leave applied successfully");
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message || "")
          : "";
      showAlert(message || "Failed to apply leave");
    } finally {
      setSubmitting(false);
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Apply Leave</h1>
        <LeavesNav currentPath="/leaves/apply" />
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
          {formData.leaveUnit !== "partial_day" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">Leave Type</label>
              <select
                value={formData.typeKey}
                onChange={(e) => setFormData({ ...formData, typeKey: e.target.value })}
                className="mt-1 w-full rounded-md border-gray-300 p-2 text-black"
              >
                {leaveTypes.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
              Partial Day is a separate free leave type. Leave type selection is not required.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {formData.isMultiDay ? "From Date" : "Date"}
              </label>
              <input
                type="date"
                required
                value={formData.fromDate}
                onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                className="mt-1 w-full rounded-md border-gray-300 p-2 text-black"
              />
            </div>
            {formData.isMultiDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700">To Date</label>
                <input
                  type="date"
                  required
                  value={formData.toDate}
                  onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                  className="mt-1 w-full rounded-md border-gray-300 p-2 text-black"
                />
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formData.isMultiDay}
              disabled={isSingleDateUnit}
              onChange={(e) => setFormData({ ...formData, isMultiDay: e.target.checked })}
            />
            Apply for multiple days
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700">Leave Unit</label>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
              {(Object.keys(LEAVE_UNIT_LABEL) as LeaveUnit[]).map((unit) => (
                <label
                  key={unit}
                  className={`flex items-center gap-2 rounded-md border p-2 text-sm ${
                    formData.leaveUnit === unit ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  } ${
                    unit === "half_day" && selectedType && !selectedType.allowHalfDay
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="leaveUnit"
                    value={unit}
                    checked={formData.leaveUnit === unit}
                    disabled={unit === "half_day" && !!selectedType && !selectedType.allowHalfDay}
                    onChange={() => setFormData({ ...formData, leaveUnit: unit })}
                  />
                  {LEAVE_UNIT_LABEL[unit]}
                </label>
              ))}
            </div>
          </div>
          {formData.leaveUnit === "half_day" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Half Day Session</label>
              <select
                value={formData.halfDaySession}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    halfDaySession: e.target.value as "first_half" | "second_half",
                  })
                }
                className="mt-1 w-full rounded-md border-gray-300 p-2 text-black"
              >
                <option value="first_half">1st Half (Day Start)</option>
                <option value="second_half">2nd Half (Day End)</option>
              </select>
            </div>
          )}
          {formData.leaveUnit === "partial_day" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Partial Minutes</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={formData.partialMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      partialMinutes: Math.max(0, Math.min(60, Number(e.target.value || 0))),
                    })
                  }
                  className="mt-1 w-full rounded-md border-gray-300 p-2 text-black"
                />
                <p className="mt-1 text-xs text-gray-500">Allowed range: 0 to 60 minutes</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Partial Day Position
                </label>
              <select
                value={formData.partialDayPosition}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    partialDayPosition: e.target.value as "start" | "end",
                  })
                }
                className="mt-1 w-full rounded-md border-gray-300 p-2 text-black"
              >
                <option value="start">Shift Start</option>
                <option value="end">Shift End</option>
              </select>
            </div>
          </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Reason</label>
            <textarea
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="mt-1  w-full rounded-md border-gray-900 p-2 text-black"
              rows={4}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Attachment URL (optional)
            </label>
            <input
              type="text"
              value={formData.attachmentUrl}
              onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
              className="mt-1 w-full rounded-md border-gray-300 p-2 text-black"
            />
          </div>
          <div className="text-sm text-gray-600">Total Leave Units (Days): {totalDays}</div>
          {hasWeekendSelection && (
            <div className="rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-700">
              Saturday and Sunday are weekly off. Leave cannot be applied on weekends.
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || hasWeekendSelection}
            className="w-full rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Apply Leave"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
