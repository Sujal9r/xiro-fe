"use client";

import Image from "next/image";
import { ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import Modal from "../../../components/Modal";
import apiCall from "../../../lib/api";
import { PERMISSIONS, PermissionKey } from "../../../lib/permissions";
import { useAlert } from "../../../components/AlertProvider";
import {
  HiOutlineCube,
  HiOutlinePencilAlt,
  HiOutlinePhotograph,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineTrash,
  HiOutlineUserAdd,
} from "react-icons/hi";

type AssetCondition = "excellent" | "good" | "needs_attention";
type AssetStatus = "available" | "assigned" | "maintenance" | "retired";
type AssignmentType = "user" | "external";

type AssigneeOption = {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
};

type Asset = {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  serialNumber: string;
  description: string;
  purchaseDate: string | null;
  purchaseCost: number;
  location: string;
  photo: string;
  condition: AssetCondition;
  status: AssetStatus;
  assignment: {
    type: AssignmentType | null;
    assignedUser: {
      id: string;
      name: string;
      email: string;
    } | null;
    name: string;
    email: string;
    assignedAt: string | null;
    notes: string;
  };
  updatedAt: string;
  history: Array<{
    action: string;
    message: string;
    createdAt: string;
    actorName: string;
  }>;
};

type AssetFormState = {
  name: string;
  category: string;
  serialNumber: string;
  description: string;
  purchaseDate: string;
  purchaseCost: string;
  location: string;
  photo: string;
  condition: AssetCondition;
  status: AssetStatus;
};

type AssignmentFormState = {
  type: AssignmentType;
  userId: string;
  name: string;
  email: string;
  notes: string;
  status: AssetStatus;
};

const defaultAssetForm: AssetFormState = {
  name: "",
  category: "Laptop",
  serialNumber: "",
  description: "",
  purchaseDate: "",
  purchaseCost: "",
  location: "",
  photo: "",
  condition: "good",
  status: "available",
};

const defaultAssignmentForm: AssignmentFormState = {
  type: "user",
  userId: "",
  name: "",
  email: "",
  notes: "",
  status: "assigned",
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Not set";

const conditionMeta: Record<
  AssetCondition,
  { label: string; card: string; dot: string; description: string }
> = {
  excellent: {
    label: "Excellent",
    card: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    description: "Ready for daily use",
  },
  good: {
    label: "Good",
    card: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
    description: "Healthy with minor wear",
  },
  needs_attention: {
    label: "Needs Attention",
    card: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    description: "Maintenance or review needed",
  },
};

const statusMeta: Record<AssetStatus, string> = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  assigned: "bg-blue-50 text-blue-700 border-blue-200",
  maintenance: "bg-amber-50 text-amber-700 border-amber-200",
  retired: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function AssetManagementPage() {
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<AssigneeOption[]>([]);
  const [search, setSearch] = useState("");
  const [conditionFilter, setConditionFilter] = useState<"all" | AssetCondition>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AssetStatus>("all");
  const [loading, setLoading] = useState(true);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assignmentAsset, setAssignmentAsset] = useState<Asset | null>(null);
  const [assetForm, setAssetForm] = useState<AssetFormState>(defaultAssetForm);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(defaultAssignmentForm);
  const { showAlert } = useAlert();

  const canCreate = permissions.includes(PERMISSIONS.ASSET_CREATE);
  const canEdit = permissions.includes(PERMISSIONS.ASSET_EDIT);
  const canAssign = permissions.includes(PERMISSIONS.ASSET_ASSIGN);
  const canSetCondition = permissions.includes(PERMISSIONS.ASSET_CONDITION_UPDATE);
  const canDelete = permissions.includes(PERMISSIONS.ASSET_DELETE);
  const canViewAllAssets = permissions.includes(PERMISSIONS.ASSET_VIEW_ALL);
  const canViewSummary = permissions.includes(PERMISSIONS.ASSET_VIEW_SUMMARY);

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const me = await apiCall("/api/auth/me");
      const perms = (me.permissions || []) as PermissionKey[];
      setPermissions(perms);

      const [assetData, metaData] = await Promise.all([
        apiCall("/api/admin/assets"),
        perms.includes(PERMISSIONS.ASSET_ASSIGN)
          ? apiCall("/api/admin/assets/meta")
          : Promise.resolve({ users: [] }),
      ]);

      setAssets((assetData.items || []) as Asset[]);
      setUsers((metaData.users || []) as AssigneeOption[]);
    } catch (error: unknown) {
      showAlert(getErrorMessage(error, "Failed to load asset panel"));
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesSearch =
        !query ||
        [asset.name, asset.assetCode, asset.category, asset.serialNumber, asset.location]
          .filter(Boolean)
          .some((item) => item.toLowerCase().includes(query));
      const matchesCondition = conditionFilter === "all" || asset.condition === conditionFilter;
      const matchesStatus = statusFilter === "all" || asset.status === statusFilter;
      return matchesSearch && matchesCondition && matchesStatus;
    });
  }, [assets, search, conditionFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = assets.length;
    const assigned = assets.filter((asset) => asset.status === "assigned").length;
    const attention = assets.filter((asset) => asset.condition === "needs_attention").length;
    const value = assets.reduce((sum, asset) => sum + (asset.purchaseCost || 0), 0);
    return { total, assigned, attention, value };
  }, [assets]);

  const recentActivity = useMemo(
    () =>
      assets
        .flatMap((asset) =>
          asset.history.map((entry) => ({
            ...entry,
            assetName: asset.name,
            assetCode: asset.assetCode,
          })),
        )
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
        .slice(0, 6),
    [assets],
  );

  const openCreateModal = () => {
    setEditingAsset(null);
    setAssetForm(defaultAssetForm);
    setShowAssetModal(true);
  };

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setAssetForm({
      name: asset.name,
      category: asset.category,
      serialNumber: asset.serialNumber,
      description: asset.description,
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.slice(0, 10) : "",
      purchaseCost: asset.purchaseCost ? String(asset.purchaseCost) : "",
      location: asset.location,
      photo: asset.photo,
      condition: asset.condition,
      status: asset.status,
    });
    setShowAssetModal(true);
  };

  const openAssignmentModal = (asset: Asset) => {
    setAssignmentAsset(asset);
    setAssignmentForm({
      type: asset.assignment.type || "user",
      userId: asset.assignment.assignedUser?.id || "",
      name: asset.assignment.type === "external" ? asset.assignment.name : "",
      email: asset.assignment.type === "external" ? asset.assignment.email : "",
      notes: asset.assignment.notes || "",
      status: asset.status === "retired" ? "assigned" : asset.status || "assigned",
    });
    setShowAssignmentModal(true);
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showAlert("Please upload an image smaller than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAssetForm((prev) => ({ ...prev, photo: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const upsertLocalAsset = (asset: Asset) => {
    setAssets((current) => {
      const exists = current.some((item) => item.id === asset.id);
      if (!exists) return [asset, ...current];
      return current.map((item) => (item.id === asset.id ? asset : item));
    });
  };

  const handleSaveAsset = async () => {
    if (!assetForm.name.trim()) {
      showAlert("Asset name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...assetForm,
        name: assetForm.name.trim(),
        category: assetForm.category.trim(),
        serialNumber: assetForm.serialNumber.trim(),
        description: assetForm.description.trim(),
        purchaseDate: assetForm.purchaseDate || null,
        purchaseCost: assetForm.purchaseCost ? Number(assetForm.purchaseCost) : 0,
        location: assetForm.location.trim(),
      };

      const response = editingAsset
        ? await apiCall(`/api/admin/assets/${editingAsset.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : await apiCall("/api/admin/assets", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      upsertLocalAsset(response.asset as Asset);
      setShowAssetModal(false);
      setEditingAsset(null);
      setAssetForm(defaultAssetForm);
    } catch (error: unknown) {
      showAlert(getErrorMessage(error, "Failed to save asset"));
    } finally {
      setSaving(false);
    }
  };

  const handleConditionChange = async (assetId: string, condition: AssetCondition) => {
    try {
      const response = await apiCall(`/api/admin/assets/${assetId}/condition`, {
        method: "PATCH",
        body: JSON.stringify({ condition }),
      });
      upsertLocalAsset(response.asset as Asset);
    } catch (error: unknown) {
      showAlert(getErrorMessage(error, "Failed to update asset condition"));
    }
  };

  const handleAssignmentSave = async () => {
    if (!assignmentAsset) return;
    if (assignmentForm.type === "user" && !assignmentForm.userId) {
      showAlert("Please choose a user");
      return;
    }
    if (assignmentForm.type === "external" && !assignmentForm.name.trim()) {
      showAlert("Please add the assignee name");
      return;
    }

    setSaving(true);
    try {
      const response = await apiCall(`/api/admin/assets/${assignmentAsset.id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({
          assignTo:
            assignmentForm.type === "user"
              ? {
                  type: "user",
                  userId: assignmentForm.userId,
                  notes: assignmentForm.notes.trim(),
                }
              : {
                  type: "external",
                  name: assignmentForm.name.trim(),
                  email: assignmentForm.email.trim(),
                  notes: assignmentForm.notes.trim(),
                },
          status: assignmentForm.status,
        }),
      });
      upsertLocalAsset(response.asset as Asset);
      setShowAssignmentModal(false);
      setAssignmentAsset(null);
    } catch (error: unknown) {
      showAlert(getErrorMessage(error, "Failed to update assignment"));
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async (asset: Asset) => {
    try {
      const response = await apiCall(`/api/admin/assets/${asset.id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({
          unassign: true,
          status: asset.condition === "needs_attention" ? "maintenance" : "available",
        }),
      });
      upsertLocalAsset(response.asset as Asset);
    } catch (error: unknown) {
      showAlert(getErrorMessage(error, "Failed to unassign asset"));
    }
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Delete ${asset.name}?`)) return;
    try {
      await apiCall(`/api/admin/assets/${asset.id}`, { method: "DELETE" });
      setAssets((current) => current.filter((item) => item.id !== asset.id));
    } catch (error: unknown) {
      showAlert(getErrorMessage(error, "Failed to delete asset"));
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
        <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_32%),linear-gradient(135deg,#f8fbff_0%,#ffffff_50%,#eef6ff_100%)] p-6 shadow-sm">
          <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-sky-200/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                <HiOutlineCube className="h-4 w-4" />
                Asset Management
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">
                {canViewAllAssets
                  ? "Clean, permission-based control for every company asset."
                  : "A focused view of the assets currently assigned to you."}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                {canViewAllAssets
                  ? "Track hardware inventory, assign ownership, monitor condition in three stages, and keep photo-backed records that look polished and stay easy to manage."
                  : "Only your assigned assets are shown here. Full inventory visibility and summary insights stay locked behind dedicated permissions."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void fetchData()}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <HiOutlineRefresh className="h-5 w-5" />
                Refresh
              </button>
              {canCreate && (
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  <HiOutlinePlus className="h-5 w-5" />
                  Add Asset
                </button>
              )}
            </div>
          </div>
        </section>

        {canViewSummary && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Assets" value={String(stats.total)} helper="Across all categories" />
            <StatCard label="Assigned" value={String(stats.assigned)} helper="Currently in use" />
            <StatCard label="Need Attention" value={String(stats.attention)} helper="Maintenance signals" />
            <StatCard label="Portfolio Value" value={currency(stats.value)} helper="Based on purchase cost" />
          </section>
        )}

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid flex-1 gap-3 md:grid-cols-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by asset, code, category, or location"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
              />
              <select
                value={conditionFilter}
                onChange={(event) => setConditionFilter(event.target.value as "all" | AssetCondition)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
              >
                <option value="all">All conditions</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="needs_attention">Needs Attention</option>
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | AssetStatus)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
              >
                <option value="all">All statuses</option>
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            <div className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-900">{filteredAssets.length}</span> assets
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_380px]">
          <div className="grid gap-5">
            {filteredAssets.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">
                  {canViewAllAssets ? "No assets found" : "No assigned assets"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {canViewAllAssets
                    ? "Try changing filters or add your first asset to start building the register."
                    : "Nothing is assigned to your profile right now. Once an asset is assigned, it will appear here."}
                </p>
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <article
                  key={asset.id}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
                >
                  <div className="grid gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
                    <div className="relative min-h-[220px] bg-[linear-gradient(135deg,#e0f2fe_0%,#f8fafc_60%,#ffffff_100%)]">
                      {asset.photo ? (
                        <Image
                          src={asset.photo}
                          alt={asset.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-[220px] items-center justify-center text-slate-400">
                          <div className="text-center">
                            <HiOutlinePhotograph className="mx-auto h-10 w-10" />
                            <p className="mt-2 text-sm font-medium">No asset photo</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                              {asset.assetCode}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta[asset.status]}`}>
                              {asset.status}
                            </span>
                          </div>
                          <h2 className="mt-3 text-2xl font-semibold text-slate-900">{asset.name}</h2>
                          <p className="mt-1 text-sm text-slate-500">
                            {asset.category} {asset.serialNumber ? `• ${asset.serialNumber}` : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(asset)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              <HiOutlinePencilAlt className="h-4 w-4" />
                              Edit
                            </button>
                          )}
                          {canAssign && (
                            <button
                              onClick={() => openAssignmentModal(asset)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                            >
                              <HiOutlineUserAdd className="h-4 w-4" />
                              {asset.assignment.type ? "Reassign" : "Assign"}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => void handleDelete(asset)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                            >
                              <HiOutlineTrash className="h-4 w-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-4">
                        <InfoTile label="Location" value={asset.location || "Not set"} />
                        <InfoTile label="Purchase Date" value={formatDate(asset.purchaseDate)} />
                        <InfoTile label="Value" value={currency(asset.purchaseCost)} />
                        <InfoTile label="Last Updated" value={formatDate(asset.updatedAt)} />
                      </div>

                      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                        <div className={`rounded-3xl border p-4 ${conditionMeta[asset.condition].card}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                                Condition
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${conditionMeta[asset.condition].dot}`} />
                                <span className="text-lg font-semibold">
                                  {conditionMeta[asset.condition].label}
                                </span>
                              </div>
                              <p className="mt-1 text-sm opacity-80">
                                {conditionMeta[asset.condition].description}
                              </p>
                            </div>
                            {canSetCondition && (
                              <select
                                value={asset.condition}
                                onChange={(event) =>
                                  void handleConditionChange(
                                    asset.id,
                                    event.target.value as AssetCondition,
                                  )
                                }
                                className="rounded-2xl border border-white/70 bg-white/90 px-3 py-2 text-sm font-medium text-slate-800 outline-none"
                              >
                                <option value="excellent">Excellent</option>
                                <option value="good">Good</option>
                                <option value="needs_attention">Needs Attention</option>
                              </select>
                            )}
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Assignment
                          </p>
                          {asset.assignment.type ? (
                            <div className="mt-3 space-y-2">
                              <p className="text-base font-semibold text-slate-900">
                                {asset.assignment.assignedUser?.name || asset.assignment.name}
                              </p>
                              <p className="text-sm text-slate-500">
                                {asset.assignment.assignedUser?.email || asset.assignment.email || "No email"}
                              </p>
                              <p className="text-sm text-slate-500">
                                Assigned on {formatDate(asset.assignment.assignedAt)}
                              </p>
                              {asset.assignment.notes && (
                                <p className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-600">
                                  {asset.assignment.notes}
                                </p>
                              )}
                              {canAssign && (
                                <button
                                  onClick={() => void handleUnassign(asset)}
                                  className="mt-2 text-sm font-semibold text-blue-700"
                                >
                                  Clear assignment
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="mt-3">
                              <p className="text-sm text-slate-500">This asset is currently unassigned.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {asset.description && (
                        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-sm leading-6 text-slate-600">{asset.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Condition stages</h3>
              <div className="mt-4 space-y-3">
                {(Object.keys(conditionMeta) as AssetCondition[]).map((condition) => (
                  <div
                    key={condition}
                    className={`rounded-3xl border px-4 py-4 ${conditionMeta[condition].card}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${conditionMeta[condition].dot}`} />
                      <p className="font-semibold">{conditionMeta[condition].label}</p>
                    </div>
                    <p className="mt-2 text-sm opacity-80">{conditionMeta[condition].description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Recent activity</h3>
              <div className="mt-4 space-y-4">
                {recentActivity.map((entry, index) => (
                  <div key={`${entry.assetCode}-${index}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{entry.assetName}</p>
                    <p className="mt-1 text-sm text-slate-600">{entry.message}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                      {entry.actorName} • {formatDate(entry.createdAt)}
                    </p>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <p className="text-sm text-slate-500">Activity will appear here once assets are added.</p>
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>

      <Modal
        open={showAssetModal}
        onClose={() => setShowAssetModal(false)}
        size="lg"
        title={editingAsset ? "Update Asset" : "Add Asset"}
        description="Create a polished asset record with inventory details, photo, stage, and status."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Asset Name">
            <input
              value={assetForm.name}
              onChange={(event) => setAssetForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              placeholder="MacBook Pro 14"
            />
          </FormField>
          <FormField label="Category">
            <input
              value={assetForm.category}
              onChange={(event) => setAssetForm((prev) => ({ ...prev, category: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              placeholder="Laptop"
            />
          </FormField>
          <FormField label="Serial Number">
            <input
              value={assetForm.serialNumber}
              onChange={(event) => setAssetForm((prev) => ({ ...prev, serialNumber: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              placeholder="SN-2026-001"
            />
          </FormField>
          <FormField label="Location">
            <input
              value={assetForm.location}
              onChange={(event) => setAssetForm((prev) => ({ ...prev, location: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              placeholder="Mumbai HQ"
            />
          </FormField>
          <FormField label="Purchase Date">
            <input
              type="date"
              value={assetForm.purchaseDate}
              onChange={(event) => setAssetForm((prev) => ({ ...prev, purchaseDate: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
            />
          </FormField>
          <FormField label="Purchase Cost">
            <input
              type="number"
              min="0"
              value={assetForm.purchaseCost}
              onChange={(event) => setAssetForm((prev) => ({ ...prev, purchaseCost: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              placeholder="135000"
            />
          </FormField>
          <FormField label="Condition">
            <select
              value={assetForm.condition}
              onChange={(event) =>
                setAssetForm((prev) => ({ ...prev, condition: event.target.value as AssetCondition }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="needs_attention">Needs Attention</option>
            </select>
          </FormField>
          <FormField label="Status">
            <select
              value={assetForm.status}
              onChange={(event) =>
                setAssetForm((prev) => ({ ...prev, status: event.target.value as AssetStatus }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
            >
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </FormField>
          <FormField label="Asset Photo" className="md:col-span-2">
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="text-sm text-slate-600" />
              <p className="mt-2 text-xs text-slate-500">Upload a product or device photo. Images are stored with the asset record.</p>
              {assetForm.photo && (
                <div className="relative mt-4 h-40 w-full overflow-hidden rounded-2xl">
                  <Image src={assetForm.photo} alt="Asset preview" fill unoptimized className="object-cover" />
                </div>
              )}
            </div>
          </FormField>
          <FormField label="Description" className="md:col-span-2">
            <textarea
              value={assetForm.description}
              onChange={(event) => setAssetForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              placeholder="Add hardware details, warranty notes, accessories, or procurement remarks."
            />
          </FormField>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setShowAssetModal(false)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSaveAsset()}
            disabled={saving}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : editingAsset ? "Update Asset" : "Create Asset"}
          </button>
        </div>
      </Modal>

      <Modal
        open={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        title="Assign Asset"
        description="Assign this asset to an employee or an external stakeholder with clear ownership notes."
      >
        <div className="grid gap-4">
          <FormField label="Assignment Type">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setAssignmentForm((prev) => ({ ...prev, type: "user" }))}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium ${
                  assignmentForm.type === "user"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                Internal User
              </button>
              <button
                onClick={() => setAssignmentForm((prev) => ({ ...prev, type: "external" }))}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium ${
                  assignmentForm.type === "external"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                External Person
              </button>
            </div>
          </FormField>

          {assignmentForm.type === "user" ? (
            <FormField label="Select User">
              <select
                value={assignmentForm.userId}
                onChange={(event) => setAssignmentForm((prev) => ({ ...prev, userId: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="">Choose an employee</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.employeeId ? `(${user.employeeId})` : ""}
                  </option>
                ))}
              </select>
            </FormField>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Assignee Name">
                <input
                  value={assignmentForm.name}
                  onChange={(event) => setAssignmentForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                  placeholder="Vendor demo team"
                />
              </FormField>
              <FormField label="Assignee Email">
                <input
                  value={assignmentForm.email}
                  onChange={(event) => setAssignmentForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                  placeholder="name@company.com"
                />
              </FormField>
            </div>
          )}

          <FormField label="Assignment Status">
            <select
              value={assignmentForm.status}
              onChange={(event) =>
                setAssignmentForm((prev) => ({ ...prev, status: event.target.value as AssetStatus }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
            >
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
              <option value="available">Available</option>
            </select>
          </FormField>

          <FormField label="Notes">
            <textarea
              value={assignmentForm.notes}
              onChange={(event) => setAssignmentForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              placeholder="Device handover notes, accessory bundle, expected return date, or agreement remarks."
            />
          </FormField>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setShowAssignmentModal(false)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleAssignmentSave()}
            disabled={saving}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Assignment"}
          </button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function FormField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
