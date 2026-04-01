"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import LeavesNav from "../../../components/LeavesNav";
import apiCall from "../../../lib/api";
import { PermissionKey } from "../../../lib/permissions";
import { useAlert } from "../../../components/AlertProvider";

interface LeaveType {
  key: string;
  name: string;
  yearlyLimit: number;
  allowHalfDay: boolean;
}

interface MeProfile {
  wfhBaseLocation?: {
    latitude?: number | null;
    longitude?: number | null;
    radius?: number | null;
  };
  permissions?: PermissionKey[];
}

type LeaveUnit = "full_day" | "half_day" | "partial_day";

const LEAVE_UNIT_LABEL: Record<LeaveUnit, string> = {
  full_day: "Full Day",
  half_day: "Half Day",
  partial_day: "Partial Day",
};

const STANDARD_WORKDAY_MINUTES = 8 * 60;

const buildMiniMapData = (
  coords?: { latitude: number; longitude: number } | null,
  radiusMeters = 100,
) => {
  if (!coords) return null;

  const mapDelta = 0.01;
  const mapLat = coords.latitude;
  const mapLng = coords.longitude;
  const mapNorth = mapLat + mapDelta;
  const mapSouth = mapLat - mapDelta;
  const mapWest = mapLng - mapDelta;
  const mapEast = mapLng + mapDelta;
  const metersPerDegreeLng = 111320 * Math.cos((mapLat * Math.PI) / 180);
  const mapWidthMeters = Math.max(1, (mapEast - mapWest) * metersPerDegreeLng);
  const point = {
    left: ((mapLng - mapWest) / (mapEast - mapWest)) * 100,
    top: ((mapNorth - mapLat) / (mapNorth - mapSouth)) * 100,
  };

  return {
    src: `https://www.openstreetmap.org/export/embed.html?bbox=${mapLng - mapDelta}%2C${mapLat - mapDelta}%2C${mapLng + mapDelta}%2C${mapLat + mapDelta}&layer=mapnik`,
    point,
    diameterPercent: (radiusMeters * 2 * 100) / mapWidthMeters,
  };
};

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
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [wfhClocking, setWfhClocking] = useState(false);
  const [savedWFHLocation, setSavedWFHLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
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
  const [wfhLocation, setWfhLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);

  useEffect(() => {
    void fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const [policy, me] = await Promise.all([
        apiCall("/api/leaves/policy"),
        apiCall("/api/auth/me"),
      ]);
      setLeaveTypes(policy.leaveTypes || []);
      if (policy.leaveTypes?.length) {
        setFormData((prev) => ({ ...prev, typeKey: policy.leaveTypes[0].key }));
      }
      const profile = me as MeProfile;
      setPermissions((profile.permissions || []) as PermissionKey[]);
      if (
        Number.isFinite(profile.wfhBaseLocation?.latitude) &&
        Number.isFinite(profile.wfhBaseLocation?.longitude)
      ) {
        const nextLocation = {
          latitude: Number(profile.wfhBaseLocation?.latitude),
          longitude: Number(profile.wfhBaseLocation?.longitude),
          accuracy: 0,
        };
        setSavedWFHLocation(nextLocation);
        setWfhLocation(nextLocation);
      }
    } catch {
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
    if (formData.leaveUnit === "half_day") return 0.5;
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
  const isWFHSelected = selectedType?.key === "wfh";
  const wfhPreviewMap = useMemo(() => buildMiniMapData(wfhLocation, 100), [wfhLocation]);
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

  useEffect(() => {
    if (isWFHSelected && !wfhLocation && savedWFHLocation) {
      setWfhLocation(savedWFHLocation);
    }
  }, [isWFHSelected, savedWFHLocation, wfhLocation]);

  const captureWFHLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      showAlert("Geolocation is not supported on this device/browser");
      return;
    }

    setCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setSavedWFHLocation(nextLocation);
        setWfhLocation(nextLocation);
        setCapturingLocation(false);
      },
      (error) => {
        setCapturingLocation(false);
        showAlert(error.message || "Unable to capture current location");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleWFHClockInFromLeavePanel = async () => {
    if (!wfhLocation) {
      showAlert("Fetch WFH location first.");
      return;
    }

    setWfhClocking(true);
    try {
      const response = await apiCall("/api/attendance/wfh-geofence-event", {
        method: "POST",
        body: JSON.stringify({
          latitude: wfhLocation.latitude,
          longitude: wfhLocation.longitude,
          eventType: "enter",
        }),
      });
      showAlert(response?.message || "WFH clock-in synced.");
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message || "")
          : "";
      showAlert(message || "WFH clock-in is only available when today’s WFH is active.");
    } finally {
      setWfhClocking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.leaveUnit !== "partial_day" && !formData.typeKey) {
      showAlert("Please select leave type");
      return;
    }
    if (!formData.fromDate) {
      showAlert("Select a leave date");
      return;
    }
    if (formData.isMultiDay && !formData.toDate) {
      showAlert("Select end date");
      return;
    }
    if (hasWeekendSelection) {
      showAlert("Saturday and Sunday are off days. Please select weekdays only.");
      return;
    }
    if (isWFHSelected && !wfhLocation) {
      showAlert("Capture your current home/work location before applying for Work From Home.");
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
          latitude: isWFHSelected ? wfhLocation?.latitude : undefined,
          longitude: isWFHSelected ? wfhLocation?.longitude : undefined,
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
      setWfhLocation(savedWFHLocation);
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
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section
          className="overflow-hidden rounded-[28px] border p-6 shadow-sm"
          style={{
            background:
              "radial-gradient(circle at top right, color-mix(in srgb, var(--accent-500) 14%, transparent), transparent 30%), linear-gradient(135deg, color-mix(in srgb, var(--card) 96%, white), var(--card))",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div
                className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
                style={{
                  borderColor: "color-mix(in srgb, var(--accent-500) 22%, var(--border))",
                  color: "var(--accent-700)",
                  backgroundColor: "color-mix(in srgb, var(--accent-500) 10%, var(--card))",
                }}
              >
                Leave Workspace
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-gray-900">Apply Leave</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                Create leave requests with clean scheduling, unit-based controls, weekend checks,
                and WFH geofence support when needed.
              </p>
            </div>
            <div
              className="grid min-w-[240px] grid-cols-2 gap-3 rounded-[24px] border p-4"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "color-mix(in srgb, var(--foreground) 3%, var(--card))",
              }}
            >
              <HeroStat label="Selected Unit" value={LEAVE_UNIT_LABEL[formData.leaveUnit]} />
              <HeroStat label="Total" value={`${totalDays}`} />
            </div>
          </div>
        </section>

        <LeavesNav currentPath="/leaves/apply" permissions={permissions} />

        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border p-6 shadow-sm"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                {formData.leaveUnit !== "partial_day" ? (
                  <Field label="Leave Type">
                    <select
                      value={formData.typeKey}
                      onChange={(e) => setFormData({ ...formData, typeKey: e.target.value })}
                      className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                      style={fieldStyle}
                    >
                      {leaveTypes.map((type) => (
                        <option key={type.key} value={type.key}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <div
                    className="rounded-2xl border px-4 py-3 text-sm md:col-span-2"
                    style={{
                      borderColor: "color-mix(in srgb, var(--accent-500) 22%, var(--border))",
                      backgroundColor: "color-mix(in srgb, var(--accent-500) 8%, var(--card))",
                      color: "var(--accent-700)",
                    }}
                  >
                    Partial Day is a separate free leave type. Leave type selection is not required.
                  </div>
                )}

                <Field label={formData.isMultiDay ? "From Date" : "Date"}>
                  <input
                    type="date"
                    required
                    value={formData.fromDate}
                    onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                    className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={fieldStyle}
                  />
                </Field>

                {formData.isMultiDay && (
                  <Field label="To Date">
                    <input
                      type="date"
                      required
                      value={formData.toDate}
                      onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                      className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                      style={fieldStyle}
                    />
                  </Field>
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
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  {(Object.keys(LEAVE_UNIT_LABEL) as LeaveUnit[]).map((unit) => (
                    <label
                      key={unit}
                      className="flex items-center gap-2 rounded-2xl border p-3 text-sm"
                      style={{
                        borderColor:
                          formData.leaveUnit === unit ? "var(--accent-500)" : "var(--border)",
                        backgroundColor:
                          formData.leaveUnit === unit
                            ? "color-mix(in srgb, var(--accent-500) 10%, var(--card))"
                            : "color-mix(in srgb, var(--foreground) 2%, var(--card))",
                        opacity:
                          unit === "half_day" && selectedType && !selectedType.allowHalfDay ? 0.5 : 1,
                        cursor:
                          unit === "half_day" && selectedType && !selectedType.allowHalfDay
                            ? "not-allowed"
                            : "pointer",
                      }}
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
                <Field label="Half Day Session">
                  <select
                    value={formData.halfDaySession}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        halfDaySession: e.target.value as "first_half" | "second_half",
                      })
                    }
                    className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={fieldStyle}
                  >
                    <option value="first_half">1st Half (Day Start)</option>
                    <option value="second_half">2nd Half (Day End)</option>
                  </select>
                </Field>
              )}

              {formData.leaveUnit === "partial_day" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Partial Minutes">
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
                      className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                      style={fieldStyle}
                    />
                    <p className="mt-1 text-xs text-gray-500">Allowed range: 0 to 60 minutes</p>
                  </Field>

                  <Field label="Partial Day Position">
                    <select
                      value={formData.partialDayPosition}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          partialDayPosition: e.target.value as "start" | "end",
                        })
                      }
                      className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                      style={fieldStyle}
                    >
                      <option value="start">Shift Start</option>
                      <option value="end">Shift End</option>
                    </select>
                  </Field>
                </div>
              )}

              <Field label="Reason">
                <textarea
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                  style={fieldStyle}
                  rows={5}
                />
              </Field>

              <Field label="Attachment URL (optional)">
                <input
                  type="text"
                  value={formData.attachmentUrl}
                  onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                  style={fieldStyle}
                />
              </Field>

              {hasWeekendSelection && (
                <div className="rounded-2xl bg-orange-50 px-3 py-2 text-sm text-orange-700">
                  Saturday and Sunday are weekly off. Leave cannot be applied on weekends.
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div
                className="rounded-[24px] border p-5"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "color-mix(in srgb, var(--foreground) 2%, var(--card))",
                }}
              >
                <div className="text-sm font-semibold text-gray-900">Request Summary</div>
                <div className="mt-4 space-y-3 text-sm">
                  <SummaryRow label="Leave Type" value={selectedType?.name || "Partial Day"} />
                  <SummaryRow label="Unit" value={LEAVE_UNIT_LABEL[formData.leaveUnit]} />
                  <SummaryRow label="Duration" value={`${totalDays}`} />
                  <SummaryRow
                    label="Dates"
                    value={
                      formData.fromDate
                        ? `${formData.fromDate}${formData.isMultiDay && formData.toDate ? ` to ${formData.toDate}` : ""}`
                        : "Not selected"
                    }
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || hasWeekendSelection}
                  className="mt-5 w-full rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: "var(--accent-600)" }}
                >
                  {submitting ? "Submitting..." : "Apply Leave"}
                </button>
              </div>

              {isWFHSelected && (
                <div
                  className="rounded-[24px] border p-5"
                  style={{
                    borderColor: "color-mix(in srgb, var(--accent-500) 16%, var(--border))",
                    backgroundColor: "color-mix(in srgb, var(--accent-500) 6%, var(--card))",
                  }}
                >
                  <div className="text-sm font-semibold" style={{ color: "var(--accent-700)" }}>
                    Work From Home geofence
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    Capture the employee&apos;s current location. After approval, dashboard attendance
                    uses this point with a fixed 100 meter WFH geofence.
                  </div>
                  {wfhLocation && (
                    <div className="mt-2 text-xs text-gray-500">
                      Saved location: {wfhLocation.latitude.toFixed(6)}, {wfhLocation.longitude.toFixed(6)} · Accuracy {Math.round(wfhLocation.accuracy)}m
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={captureWFHLocation}
                      disabled={capturingLocation}
                      className="rounded-2xl px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      style={{ backgroundColor: "var(--accent-600)" }}
                    >
                      {capturingLocation ? "Capturing..." : wfhLocation ? "Refresh Location" : "Use Current Location"}
                    </button>
                    <button
                      type="button"
                      onClick={handleWFHClockInFromLeavePanel}
                      disabled={wfhClocking || !wfhLocation}
                      className="rounded-2xl border px-4 py-2 text-sm font-medium disabled:opacity-50"
                      style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                    >
                      {wfhClocking ? "Syncing..." : "Clock In After Fetch"}
                    </button>
                  </div>
                  <div className="mt-4">
                    {wfhPreviewMap ? (
                      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)" }}>
                        <div className="relative h-64 w-full">
                          <iframe
                            title="WFH Geofence Map"
                            src={wfhPreviewMap.src}
                            className="h-full w-full"
                            loading="lazy"
                          />
                          <div className="pointer-events-none absolute inset-0">
                            <div
                              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-blue-500/15"
                              style={{
                                left: `${wfhPreviewMap.point.left}%`,
                                top: `${wfhPreviewMap.point.top}%`,
                                width: `${wfhPreviewMap.diameterPercent}%`,
                                height: `${wfhPreviewMap.diameterPercent}%`,
                                borderColor: "color-mix(in srgb, var(--accent-500) 65%, white)",
                              }}
                            />
                            <div
                              className="absolute -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full ring-2 ring-white"
                              style={{
                                left: `${wfhPreviewMap.point.left}%`,
                                top: `${wfhPreviewMap.point.top}%`,
                                backgroundColor: "var(--accent-500)",
                              }}
                            />
                          </div>
                        </div>
                        <div
                          className="border-t px-3 py-2 text-xs text-gray-500"
                          style={{ borderColor: "var(--border)" }}
                        >
                          Your live point is shown with the 100 meter WFH fence.
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex h-48 items-center justify-center rounded-2xl border border-dashed px-4 text-center text-sm text-gray-500"
                        style={{ borderColor: "var(--border)" }}
                      >
                        Fetch location to preview the WFH geofence map.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

const fieldStyle = {
  borderColor: "var(--border)",
  backgroundColor: "color-mix(in srgb, var(--foreground) 3%, var(--card))",
  color: "var(--foreground)",
} as const;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}
