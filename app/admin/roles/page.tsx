"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import Modal from "../../../components/Modal";
import apiCall from "../../../lib/api";
import { PERMISSION_GROUPS, PERMISSION_LABELS, PERMISSIONS, PermissionKey } from "../../../lib/permissions";
import { useAlert } from "../../../components/AlertProvider";

interface Role {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
}

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: "", permissions: [] as string[] });
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [userPermissions, setUserPermissions] = useState<PermissionKey[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchData();
  }, []);

  const sanitizePermissions = (perms: string[]) =>
    perms.filter((perm) => availablePermissions.includes(perm));

  const getPermissionLabel = (perm: string) =>
    (PERMISSION_LABELS as Record<string, string>)[perm] || perm;

  const orderedPermissions = useMemo(() => {
    const hiddenPermissions = new Set([
      "view.admin.users",
      "view.hr.employees",
      "view.admin.attendance",
    ]);
    const available = new Set(
      availablePermissions.filter((perm) => !hiddenPermissions.has(perm)),
    );
    const grouped = PERMISSION_GROUPS.map((group) => ({
      ...group,
      permissions: group.permissions.filter((perm) => available.has(perm)),
    })).filter((group) => group.permissions.length > 0);

  const groupedSet = new Set<string>(
  grouped.flatMap((group) => group.permissions as string[])
);
  const leftovers = availablePermissions.filter(
  (perm) =>
    !groupedSet.has(perm as any) && !hiddenPermissions.has(perm),
);

    if (leftovers.length > 0) {
      grouped.push({
        id: "other",
        title: "Other",
        permissions: leftovers as any,
      });
    }

    return grouped;
  }, [availablePermissions]);

  const fetchData = async () => {
    try {
      // Fetch current user info
      const me = await apiCall("/api/auth/me");
      setUserRole(me.role || "");
      setUserPermissions((me.permissions || []) as PermissionKey[]);

      // Fetch roles data
      const rolesData = await apiCall("/api/admin/roles");
      setRoles(rolesData.roles || []);
      setAvailablePermissions(rolesData.availablePermissions || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // Check if user can edit system roles (must be superadmin or have MANAGE_ROLES permission)
  const canEditSystemRole = userRole === "superadmin" || userPermissions.includes(PERMISSIONS.MANAGE_ROLES);

  const customRoles = useMemo(() => roles, [roles]);

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setIsCreateMode(false);
    setFormData({
      name: role.name || role.key,
      permissions: sanitizePermissions(role.permissions || []),
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setIsCreateMode(true);
    setFormData({ name: "", permissions: [] });
    setShowModal(true);
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall("/api/admin/roles", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          permissions: sanitizePermissions(formData.permissions),
        }),
      });
      setShowModal(false);
      setIsCreateMode(false);
      setFormData({ name: "", permissions: [] });
      fetchData();
    } catch (error: any) {
      showAlert(error.message || "Failed to create role");
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    if (editingRole.isSystem && !canEditSystemRole) {
      showAlert("Only Super Admin can edit system roles.");
      return;
    }
    try {
      await apiCall(`/api/admin/roles/${editingRole.id || editingRole.key}`, {
        method: "PUT",
        body: JSON.stringify({
          name: formData.name,
          permissions: sanitizePermissions(formData.permissions),
        }),
      });
      setShowModal(false);
      setEditingRole(null);
      setFormData({ name: "", permissions: [] });
      fetchData();
    } catch (error: any) {
      showAlert(error.message || "Failed to update role");
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await apiCall(`/api/admin/roles/${role.id || role.key}`, {
        method: "DELETE",
      });
      fetchData();
    } catch (error: any) {
      showAlert(error.message || "Failed to delete role");
    }
  };

  const togglePermission = (perm: string) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(perm);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== perm)
          : [...prev.permissions, perm],
      };
    });
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Role
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customRoles.map((role) => (
                <tr key={role.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {role.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">Custom</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{role.key}</td>
                  <td className="px-6 py-4 text-sm font-medium space-x-2">
                    <button
                      onClick={() => openEditModal(role)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-sm text-gray-500 text-center"
                  >
                    No roles found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        <Modal
          open={showModal && !!(editingRole || isCreateMode)}
          title={isCreateMode ? "Create Role" : "Edit Role"}
          onClose={() => {
            setShowModal(false);
            setEditingRole(null);
            setIsCreateMode(false);
          }}
          size="lg"
        >
          <form onSubmit={isCreateMode ? handleCreateRole : handleUpdateRole}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 text-black block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Permissions
                </label>
                <div className="mt-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3 space-y-4">
                  {orderedPermissions.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {group.title}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.permissions.map((perm) => (
                          <label key={perm} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(perm)}
                              onChange={() => togglePermission(perm)}
                            />
                            <span className="text-gray-800">
                              {getPermissionLabel(perm)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
              >
                {isCreateMode ? "Create" : "Update"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingRole(null);
                  setIsCreateMode(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
