"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import LeavesNav from "../../../components/LeavesNav";
import apiCall from "../../../lib/api";
import { PERMISSIONS, PermissionKey } from "../../../lib/permissions";
import { useAlert } from "../../../components/AlertProvider";

interface LeaveType {
  key: string;
  name: string;
  yearlyLimit: number;
  allowCarryForward: boolean;
  maxCarryForward: number;
  allowHalfDay: boolean;
  paid: boolean;
}

export default function LeavePolicyPage() {
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<{
    leaveTypes: LeaveType[];
    resetMonth: number;
    resetDay: number;
    regularizationBalance: number;
  } | null>(null);
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [saving, setSaving] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const [policyData, me] = await Promise.all([
        apiCall("/api/leaves/policy"),
        apiCall("/api/auth/me"),
      ]);
      setPolicy(policyData);
      setPermissions((me.permissions || []) as PermissionKey[]);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const canManage = permissions.includes(PERMISSIONS.LEAVE_POLICY_MANAGE);

  const updateType = (
    index: number,
    key: keyof LeaveType,
    value: LeaveType[keyof LeaveType],
  ) => {
    if (!policy) return;
    const updated = [...policy.leaveTypes];
    updated[index] = { ...updated[index], [key]: value };
    setPolicy({ ...policy, leaveTypes: updated });
  };

  const handleSave = async () => {
    if (!policy) return;
    setSaving(true);
    try {
      await apiCall("/api/leaves/policy", {
        method: "PUT",
        body: JSON.stringify(policy),
      });
      showAlert("Policy updated");
    } catch (error) {
      showAlert(error instanceof Error ? error.message : "Failed to update policy");
    } finally {
      setSaving(false);
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

  if (!policy) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Leave Policy</h1>
          {canManage && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Policy"}
            </button>
          )}
        </div>
        <LeavesNav currentPath="/leaves/policy" />

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Reset Month</label>
              <input
                type="number"
                min={1}
                max={12}
                value={policy.resetMonth}
                disabled={!canManage}
                onChange={(e) =>
                  setPolicy({ ...policy, resetMonth: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-md border-gray-300 p-2 text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Reset Day</label>
              <input
                type="number"
                min={1}
                max={31}
                value={policy.resetDay}
                disabled={!canManage}
                onChange={(e) =>
                  setPolicy({ ...policy, resetDay: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-md border-gray-300 p-2 text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Regularization Balance
              </label>
              <input
                type="number"
                min={0}
                value={policy.regularizationBalance ?? 0}
                disabled={!canManage}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    regularizationBalance: Math.max(0, Number(e.target.value || 0)),
                  })
                }
                className="mt-1 w-full rounded-md border-gray-300 p-2 text-black"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Yearly Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Carry Forward
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Max Carry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Half Day
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {policy.leaveTypes.map((type, index) => (
                  <tr key={type.key}>
                    <td className="px-6 py-4 text-sm text-gray-900">{type.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <input
                        type="number"
                        value={type.yearlyLimit}
                        disabled={!canManage}
                        onChange={(e) => updateType(index, "yearlyLimit", Number(e.target.value))}
                        className="w-24 rounded-md border-gray-300 p-1 text-black"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <input
                        type="checkbox"
                        checked={type.allowCarryForward}
                        disabled={!canManage}
                        onChange={(e) => updateType(index, "allowCarryForward", e.target.checked)}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <input
                        type="number"
                        value={type.maxCarryForward}
                        disabled={!canManage}
                        onChange={(e) => updateType(index, "maxCarryForward", Number(e.target.value))}
                        className="w-24 rounded-md border-gray-300 p-1 text-black"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <input
                        type="checkbox"
                        checked={type.allowHalfDay}
                        disabled={!canManage}
                        onChange={(e) => updateType(index, "allowHalfDay", e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
                {policy.leaveTypes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                      No leave types configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
