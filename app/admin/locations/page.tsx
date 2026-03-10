"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import apiCall from "../../../lib/api";
import { PERMISSIONS, PermissionKey } from "../../../lib/permissions";

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

export default function LocationManagementPage() {
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [geofence, setGeofence] = useState<GeofenceConfig | null>(null);
  const [geofenceName, setGeofenceName] = useState("Office Geofence");
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [enforceClockOut, setEnforceClockOut] = useState(true);
  const [branchForm, setBranchForm] = useState({
    id: "",
    name: "",
    code: "",
    lat: "",
    lng: "",
    radiusMeters: "250",
    isActive: true,
  });
  const [savingGeofence, setSavingGeofence] = useState(false);
  const [savingBranch, setSavingBranch] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const canManageLocations =
    permissions.includes(PERMISSIONS.MANAGE_USERS) ||
    permissions.includes(PERMISSIONS.EDIT_EMPLOYEE);

  const previewLat = Number(branchForm.lat);
  const previewLng = Number(branchForm.lng);
  const hasPreviewCoords = Number.isFinite(previewLat) && Number.isFinite(previewLng);
  const previewDelta = 0.01;
  const previewMapSrc = hasPreviewCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${previewLng - previewDelta}%2C${previewLat - previewDelta}%2C${previewLng + previewDelta}%2C${previewLat + previewDelta}&layer=mapnik&marker=${previewLat}%2C${previewLng}`
    : "";

  const setFeedback = (nextMessage: string, nextError = "") => {
    setMessage(nextMessage);
    setError(nextError);
  };

  const fetchLocationSettings = useCallback(async () => {
    setLoading(true);
    try {
      const me = await apiCall("/api/auth/me");
      const perms = (me.permissions || []) as PermissionKey[];
      setPermissions(perms);
      const config = (await apiCall("/api/admin/geofence")) as GeofenceConfig;
      setGeofence(config);
      setGeofenceName(config.name || "Office Geofence");
      setGeofenceEnabled(!!config.enabled);
      setEnforceClockOut(config.enforceClockOut !== false);
    } catch (fetchError) {
      setFeedback("", "Failed to load location settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocationSettings();
  }, [fetchLocationSettings]);

  const resetBranchForm = () => {
    setBranchForm({
      id: "",
      name: "",
      code: "",
      lat: "",
      lng: "",
      radiusMeters: "250",
      isActive: true,
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFeedback("", "Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBranchForm((prev) => ({
          ...prev,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        }));
      },
      (geoError) => setFeedback("", geoError.message || "Unable to read current location."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const handleSaveGeofence = async () => {
    setSavingGeofence(true);
    setFeedback("");
    try {
      await apiCall("/api/admin/geofence", {
        method: "PUT",
        body: JSON.stringify({
          enabled: geofenceEnabled,
          name: geofenceName,
          enforceClockOut,
        }),
      });
      await fetchLocationSettings();
      setFeedback("Location restrictions updated.");
    } catch (saveError) {
      const errorMessage =
        saveError instanceof Error ? saveError.message : "Failed to update location settings.";
      setFeedback("", errorMessage);
    } finally {
      setSavingGeofence(false);
    }
  };

  const handleEditBranch = (branch: OfficeBranch) => {
    setBranchForm({
      id: branch.id,
      name: branch.name,
      code: branch.code || "",
      lat: branch.center.lat.toString(),
      lng: branch.center.lng.toString(),
      radiusMeters: branch.radiusMeters.toString(),
      isActive: branch.isActive,
    });
  };

  const handleSaveBranch = async () => {
    const payload = {
      name: branchForm.name.trim(),
      code: branchForm.code.trim(),
      center: {
        lat: Number(branchForm.lat),
        lng: Number(branchForm.lng),
      },
      radiusMeters: Number(branchForm.radiusMeters),
      isActive: branchForm.isActive,
    };

    setSavingBranch(true);
    setFeedback("");
    try {
      if (branchForm.id) {
        await apiCall(`/api/admin/branches/${branchForm.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setFeedback("Branch updated.");
      } else {
        await apiCall("/api/admin/branches", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setFeedback("Branch created.");
      }
      await fetchLocationSettings();
      resetBranchForm();
    } catch (saveError) {
      const errorMessage =
        saveError instanceof Error ? saveError.message : "Failed to save branch.";
      setFeedback("", errorMessage);
    } finally {
      setSavingBranch(false);
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (!confirm("Delete this branch?")) return;
    setFeedback("");
    try {
      await apiCall(`/api/admin/branches/${branchId}`, { method: "DELETE" });
      await fetchLocationSettings();
      if (branchForm.id === branchId) resetBranchForm();
      setFeedback("Branch deleted.");
    } catch (deleteError) {
      const errorMessage =
        deleteError instanceof Error ? deleteError.message : "Failed to delete branch.";
      setFeedback("", errorMessage);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Location Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage office branches and attendance geo-boundaries.
          </p>
        </div>

        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Geofence Controls</h2>
            {!canManageLocations && <span className="text-xs text-gray-500">Read only</span>}
          </div>

          {(message || error) && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                error
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {error || message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-gray-700">
              Geofence Name
              <input
                value={geofenceName}
                onChange={(e) => setGeofenceName(e.target.value)}
                disabled={!canManageLocations}
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-black disabled:bg-gray-100"
              />
            </label>
            <label className="text-sm text-gray-700">
              Clock-out Restriction
              <select
                value={enforceClockOut ? "yes" : "no"}
                onChange={(e) => setEnforceClockOut(e.target.value === "yes")}
                disabled={!canManageLocations}
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-black disabled:bg-gray-100"
              >
                <option value="yes">Require in-area for clock out</option>
                <option value="no">Allow clock out from anywhere</option>
              </select>
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={geofenceEnabled}
              onChange={(e) => setGeofenceEnabled(e.target.checked)}
              disabled={!canManageLocations}
            />
            Enable office area restriction
          </label>

          {canManageLocations && (
            <button
              onClick={handleSaveGeofence}
              disabled={savingGeofence}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {savingGeofence ? "Saving..." : "Save Geofence Settings"}
            </button>
          )}
        </section>

        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Office Branches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Branch name"
              value={branchForm.name}
              onChange={(e) => setBranchForm((prev) => ({ ...prev, name: e.target.value }))}
              disabled={!canManageLocations}
              className="rounded-lg border border-gray-200 p-2 text-black disabled:bg-gray-100"
            />
            <input
              placeholder="Code (optional)"
              value={branchForm.code}
              onChange={(e) => setBranchForm((prev) => ({ ...prev, code: e.target.value }))}
              disabled={!canManageLocations}
              className="rounded-lg border border-gray-200 p-2 text-black disabled:bg-gray-100"
            />
            <input
              placeholder="Latitude"
              value={branchForm.lat}
              onChange={(e) => setBranchForm((prev) => ({ ...prev, lat: e.target.value }))}
              disabled={!canManageLocations}
              className="rounded-lg border border-gray-200 p-2 text-black disabled:bg-gray-100"
            />
            <input
              placeholder="Longitude"
              value={branchForm.lng}
              onChange={(e) => setBranchForm((prev) => ({ ...prev, lng: e.target.value }))}
              disabled={!canManageLocations}
              className="rounded-lg border border-gray-200 p-2 text-black disabled:bg-gray-100"
            />
            <input
              placeholder="Radius meters"
              value={branchForm.radiusMeters}
              onChange={(e) =>
                setBranchForm((prev) => ({ ...prev, radiusMeters: e.target.value }))
              }
              disabled={!canManageLocations}
              className="rounded-lg border border-gray-200 p-2 text-black disabled:bg-gray-100"
            />
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={branchForm.isActive}
                onChange={(e) =>
                  setBranchForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
                disabled={!canManageLocations}
              />
              Active branch
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {canManageLocations && (
              <>
                <button
                  onClick={handleUseCurrentLocation}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Use My Current Location
                </button>
                <button
                  onClick={handleSaveBranch}
                  disabled={savingBranch}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingBranch ? "Saving..." : branchForm.id ? "Update Branch" : "Add Branch"}
                </button>
                {branchForm.id && (
                  <button
                    onClick={resetBranchForm}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Clear Edit
                  </button>
                )}
              </>
            )}
          </div>

          {previewMapSrc && (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <iframe
                title="Branch Location Preview"
                src={previewMapSrc}
                className="h-56 w-full"
                loading="lazy"
              />
            </div>
          )}

          <div className="space-y-2">
            {(geofence?.branches || []).map((branch) => (
              <div
                key={branch.id}
                className="rounded-lg border border-gray-200 p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {branch.name} {branch.code ? `(${branch.code})` : ""}
                  </div>
                  <div className="text-xs text-gray-500">
                    {branch.center.lat.toFixed(6)}, {branch.center.lng.toFixed(6)} • Radius{" "}
                    {Math.round(branch.radiusMeters)}m • {branch.isActive ? "Active" : "Inactive"}
                  </div>
                </div>
                {canManageLocations && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditBranch(branch)}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBranch(branch.id)}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!(geofence?.branches || []).length && (
              <div className="text-sm text-gray-500">No office branches configured.</div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
