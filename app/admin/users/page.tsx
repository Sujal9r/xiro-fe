"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import Modal from "../../../components/Modal";
import apiCall from "../../../lib/api";
import { PERMISSIONS, PermissionKey } from "../../../lib/permissions";
import { useAlert } from "../../../components/AlertProvider";
import { HiOutlineFunnel } from "react-icons/hi2";

interface CustomRole {
  id?: string;
  _id?: string;
  name: string;
  key: string;
  permissions?: string[];
  isSystem?: boolean;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  customRole?: CustomRole | null;
  isActive: boolean;
  createdAt: string;
  leave?: {
    typeName?: string;
    halfDay?: boolean;
    fromDate?: string;
    toDate?: string;
  } | null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [showRoleFilterMenu, setShowRoleFilterMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "custom",
    customRoleId: "",
  });
  const { showAlert } = useAlert();

  useEffect(() => {
    initPage();
  }, []);

  const fetchPermissions = async () => {
    const me = await apiCall("/api/auth/me");
    const perms = (me.permissions || []) as PermissionKey[];
    setPermissions(perms);
    return perms;
  };

  const fetchUsers = async (perms: PermissionKey[] = permissions) => {
    try {
      const canViewAdmin =
        perms.includes(PERMISSIONS.VIEW_ADMIN_USERS) ||
        perms.includes(PERMISSIONS.VIEW_EMPLOYEES);
      const endpoint = canViewAdmin ? "/api/admin/users" : "/api/hr/employees";
      const data = await apiCall(endpoint);
      const filtered = Array.isArray(data)
        ? data.filter((user: User) => user.role !== "superadmin")
        : [];
      setUsers(filtered);
    } catch (error) {
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await apiCall("/api/admin/roles");
      setRoles(data.roles || []);
    } catch (error) {
      setRoles([]);
    }
  };

  const initPage = async () => {
    try {
      const perms = await fetchPermissions();
      await fetchUsers(perms);
      if (
        perms.includes(PERMISSIONS.MANAGE_USERS) ||
        perms.includes(PERMISSIONS.CREATE_EMPLOYEE) ||
        perms.includes(PERMISSIONS.EDIT_EMPLOYEE)
      ) {
        await fetchRoles();
      } else {
        setRoles([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const systemRoles = useMemo(() => [], [roles]);
  const customRoles = useMemo(() => roles, [roles]);

  const getRoleLabel = useCallback(
    (user: User) => (user.role === "custom" ? user.customRole?.name || "Custom" : user.role),
    []
  );

  const getStatusBadge = useCallback((user: User) => {
    if (user.leave?.halfDay) {
      return {
        label: "Half Day",
        className: "bg-orange-100 text-orange-700",
      };
    }
    if (user.leave) {
      return {
        label: "On Leave",
        className: "bg-blue-100 text-blue-700",
      };
    }
    if (user.isActive) {
      return { label: "Active", className: "bg-green-100 text-green-800" };
    }
    return { label: "Disabled", className: "bg-red-100 text-red-800" };
  }, []);

  const roleFilterOptions = useMemo(() => {
    const uniqueRoles = Array.from(new Set(users.map((user) => getRoleLabel(user))));
    return ["all", ...uniqueRoles];
  }, [users, getRoleLabel]);

  const filteredUsers = useMemo(() => {
    if (selectedRoleFilter === "all") return users;
    return users.filter((user) => getRoleLabel(user) === selectedRoleFilter);
  }, [users, selectedRoleFilter, getRoleLabel]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customRoleId) {
      showAlert("Please select a custom role.");
      return;
    }
    try {
      await apiCall("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          customRoleId: formData.role === "custom" ? formData.customRoleId : null,
        }),
      });
      setShowModal(false);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "custom",
        customRoleId: "",
      });
      fetchUsers();
    } catch (error: any) {
      showAlert(error.message || "Failed to create user");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!formData.customRoleId) {
      showAlert("Please select a custom role.");
      return;
    }
    try {
      await apiCall(`/api/admin/users/${editingUser._id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: "custom",
          customRoleId: formData.customRoleId,
        }),
      });
      setShowModal(false);
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "custom",
        customRoleId: "",
      });
      fetchUsers();
    } catch (error: any) {
      showAlert(error.message || "Failed to update user");
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      await apiCall(`/api/admin/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      fetchUsers();
    } catch (error: any) {
      showAlert(error.message || "Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await apiCall(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      fetchUsers();
    } catch (error: any) {
      showAlert(error.message || "Failed to delete user");
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: "custom",
      customRoleId: user.customRole?.id || user.customRole?._id || "",
    });
    setShowModal(true);
  };

  const canCreate =
    permissions.includes(PERMISSIONS.MANAGE_USERS) ||
    permissions.includes(PERMISSIONS.CREATE_EMPLOYEE);
  const canEdit =
    permissions.includes(PERMISSIONS.MANAGE_USERS) ||
    permissions.includes(PERMISSIONS.EDIT_EMPLOYEE);
  const canDelete =
    permissions.includes(PERMISSIONS.MANAGE_USERS) ||
    permissions.includes(PERMISSIONS.DELETE_EMPLOYEE);
  const canToggleStatus =
    permissions.includes(PERMISSIONS.MANAGE_USERS) ||
    permissions.includes(PERMISSIONS.TOGGLE_EMPLOYEE_STATUS);
  const canViewStatus =
    permissions.includes(PERMISSIONS.VIEW_ADMIN_USERS) ||
    permissions.includes(PERMISSIONS.VIEW_HR_EMPLOYEES) ||
    permissions.includes(PERMISSIONS.VIEW_EMPLOYEES) ||
    permissions.includes(PERMISSIONS.VIEW_EMPLOYEE_STATUS);
  const tableColumnCount = useMemo(() => {
    let count = 3;
    if (canViewStatus) count += 1;
    if (canEdit || canDelete || canToggleStatus) count += 1;
    return count;
  }, [canViewStatus, canEdit, canDelete, canToggleStatus]);

  const openCreateModal = () => {
    if (!canCreate) return;
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "custom",
      customRoleId: "",
    });
    setShowModal(true);
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
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleFilterMenu((prev) => !prev)}
                className="h-11 w-11 rounded-full border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors inline-flex items-center justify-center"
                title="Filter roles"
              >
                <HiOutlineFunnel className="h-5 w-5" />
              </button>
              {showRoleFilterMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-20">
                  {roleFilterOptions.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setSelectedRoleFilter(role);
                        setShowRoleFilterMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        selectedRoleFilter === role
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700"
                      }`}
                    >
                      {role === "all" ? "All roles" : role}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {canCreate && (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create User
              </button>
            )}
          </div>
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
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                {canViewStatus && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                )}
                {(canEdit || canDelete || canToggleStatus) && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const status = getStatusBadge(user);
                return (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === "admin" || user.role === "superadmin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {getRoleLabel(user)}
                    </span>
                  </td>
                  {canViewStatus && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                  )}
                  {(canEdit || canDelete || canToggleStatus) && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {canEdit && (
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                      )}
                      {canToggleStatus && (
                        <button
                          onClick={() => handleToggleActive(user._id, user.isActive)}
                          className={`${
                            user.isActive ? "text-yellow-600" : "text-green-600"
                          } hover:opacity-80`}
                        >
                          {user.isActive ? "Disable" : "Enable"}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={tableColumnCount}
                    className="px-6 py-6 text-sm text-center text-gray-500"
                  >
                    No users found for selected role.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Modal */}
        <Modal
          open={showModal && (canCreate || canEdit)}
          title={editingUser ? "Edit User" : "Create User"}
          onClose={() => {
            setShowModal(false);
            setEditingUser(null);
          }}
          size="md"
        >
          <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 text-black block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 text-black p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="mt-1 text-black p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={formData.customRoleId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setFormData({ ...formData, role: "custom", customRoleId: id });
                  }}
                  className="mt-1 text-black p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {customRoles.length > 0 ? (
                    customRoles.map((role) => (
                      <option key={role.id || role._id} value={role.id || role._id}>
                        {role.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      No roles available
                    </option>
                  )}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                {editingUser ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingUser(null);
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
