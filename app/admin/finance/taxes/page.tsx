"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import apiCall from "../../../../lib/api";
import { useAlert } from "../../../../components/AlertProvider";

type TaxType = {
  id: string;
  name: string;
  slug: string;
  description: string;
  defaultPercentage: number;
  isPercentageBased: boolean;
};

type Tax = {
  id: string;
  user: {
    id: string;
    name: string;
    employeeId: string;
  };
  taxType: string;
  amount: number;
  percentage: number;
  month: number;
  year: number;
  salary: number;
  remarks: string;
  addedBy: string;
  createdAt: string;
};

export default function TaxManagementPage() {
  const { showAlert } = useAlert();
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tax-types" | "manage-taxes" | "bulk-apply">("manage-taxes");
  const [users, setUsers] = useState<Array<{ _id: string; name: string; employeeId: string }>>(
    []
  );

  // Bulk tax application state
  const [bulkTaxMonth, setBulkTaxMonth] = useState(new Date().getMonth() + 1);
  const [bulkTaxYear, setBulkTaxYear] = useState(new Date().getFullYear());
  const [bulkTaxConfigs, setBulkTaxConfigs] = useState<Array<{
    taxType: string;
    amount: string;
    percentage: string;
    remarks: string;
    applyToAll: boolean;
    employeeIds: string[];
  }>>([]);
  const [bulkApplying, setBulkApplying] = useState(false);

  // New tax type form
  const [newTaxType, setNewTaxType] = useState({
    name: "",
    description: "",
    defaultPercentage: 0,
    isPercentageBased: false,
  });

  // New tax form
  const [newTax, setNewTax] = useState({
    userId: "",
    taxType: "",
    amount: "",
    percentage: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    remarks: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesData, taxesData, usersData] = await Promise.all([
        apiCall("/api/finance/tax-types"),
        apiCall("/api/finance/taxes"),
        apiCall("/api/employees"),
      ]);
      setTaxTypes(typesData.items || []);
      setTaxes(taxesData.items || []);
      setUsers(usersData.items || usersData || []);
    } catch (error: any) {
      showAlert(error?.message || "Failed to load tax data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTaxType = async () => {
    if (!newTaxType.name.trim()) {
      showAlert("Tax type name is required");
      return;
    }

    try {
      const created = await apiCall("/api/finance/tax-types", {
        method: "POST",
        body: JSON.stringify(newTaxType),
      });
      setTaxTypes((prev) => [...prev, created]);
      setNewTaxType({
        name: "",
        description: "",
        defaultPercentage: 0,
        isPercentageBased: false,
      });
      showAlert("Tax type created successfully");
    } catch (error: any) {
      showAlert(error?.message || "Failed to create tax type");
    }
  };

  const handleAddTax = async () => {
    if (!newTax.userId || !newTax.taxType) {
      showAlert("Employee and tax type are required");
      return;
    }

    const amount = newTax.amount ? Number(newTax.amount) : 0;
    const percentage = newTax.percentage ? Number(newTax.percentage) : 0;

    if (amount <= 0 && percentage <= 0) {
      showAlert("Amount or percentage must be greater than 0");
      return;
    }

    try {
      const created = await apiCall("/api/finance/taxes", {
        method: "POST",
        body: JSON.stringify({
          userId: newTax.userId,
          taxType: newTax.taxType,
          amount,
          percentage,
          month: newTax.month,
          year: newTax.year,
          remarks: newTax.remarks,
        }),
      });
      setTaxes((prev) => [...prev, created]);
      setNewTax({
        userId: "",
        taxType: "",
        amount: "",
        percentage: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        remarks: "",
      });
      showAlert("Tax record created successfully");
    } catch (error: any) {
      showAlert(error?.message || "Failed to create tax");
    }
  };

  const handleDeleteTax = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tax record?")) return;

    try {
      await apiCall(`/api/finance/taxes/${id}`, { method: "DELETE" });
      setTaxes((prev) => prev.filter((t) => t.id !== id));
      showAlert("Tax record deleted successfully");
    } catch (error: any) {
      showAlert(error?.message || "Failed to delete tax");
    }
  };

  const addBulkTaxConfig = () => {
    setBulkTaxConfigs((prev) => [
      ...prev,
      {
        taxType: "",
        amount: "",
        percentage: "",
        remarks: "",
        applyToAll: true,
        employeeIds: [],
      },
    ]);
  };

  const updateBulkTaxConfig = (index: number, field: string, value: any) => {
    setBulkTaxConfigs((prev) =>
      prev.map((config, i) =>
        i === index ? { ...config, [field]: value } : config
      )
    );
  };

  const removeBulkTaxConfig = (index: number) => {
    setBulkTaxConfigs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkApplyTaxes = async () => {
    if (bulkTaxConfigs.length === 0) {
      showAlert("Please add at least one tax configuration");
      return;
    }

    const validConfigs = bulkTaxConfigs.filter(
      (config) => config.taxType && (config.amount || config.percentage)
    );

    if (validConfigs.length === 0) {
      showAlert("Please ensure at least one tax configuration has a tax type and amount/percentage");
      return;
    }

    setBulkApplying(true);
    try {
      const result = await apiCall("/api/finance/taxes/bulk", {
        method: "POST",
        body: JSON.stringify({
          month: bulkTaxMonth,
          year: bulkTaxYear,
          taxConfigurations: validConfigs.map((config) => ({
            taxType: config.taxType,
            amount: config.amount ? Number(config.amount) : 0,
            percentage: config.percentage ? Number(config.percentage) : 0,
            remarks: config.remarks,
            applyToAll: config.applyToAll,
            employeeIds: config.employeeIds,
          })),
        }),
      });

      showAlert(result.message);
      fetchData(); // Refresh the tax list
      setBulkTaxConfigs([]); // Reset form
    } catch (error: any) {
      showAlert(error?.message || "Failed to apply bulk taxes");
    } finally {
      setBulkApplying(false);
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
        <h1 className="text-3xl font-bold text-gray-900">Tax Management</h1>

        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setTab("manage-taxes")}
            className={`px-4 py-2 font-medium ${
              tab === "manage-taxes"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600"
            }`}
          >
            Manage Taxes
          </button>
          <button
            onClick={() => setTab("bulk-apply")}
            className={`px-4 py-2 font-medium ${
              tab === "bulk-apply"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600"
            }`}
          >
            Bulk Apply Taxes
          </button>
          <button
            onClick={() => setTab("tax-types")}
            className={`px-4 py-2 font-medium ${
              tab === "tax-types"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600"
            }`}
          >
            Tax Types
          </button>
        </div>

        {tab === "tax-types" && (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-bold text-gray-900">Add Tax Type</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Tax Type Name"
                  value={newTaxType.name}
                  onChange={(e) =>
                    setNewTaxType((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="rounded-md border border-gray-200 p-2 text-black"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newTaxType.description}
                  onChange={(e) =>
                    setNewTaxType((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="rounded-md border border-gray-200 p-2 text-black"
                />
                <input
                  type="number"
                  placeholder="Default Percentage"
                  value={newTaxType.defaultPercentage}
                  onChange={(e) =>
                    setNewTaxType((prev) => ({
                      ...prev,
                      defaultPercentage: Number(e.target.value),
                    }))
                  }
                  className="rounded-md border border-gray-200 p-2 text-black"
                />
                <label className="flex items-center gap-2 p-2">
                  <input
                    type="checkbox"
                    checked={newTaxType.isPercentageBased}
                    onChange={(e) =>
                      setNewTaxType((prev) => ({
                        ...prev,
                        isPercentageBased: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-gray-700">Percentage Based</span>
                </label>
                <button
                  onClick={handleAddTaxType}
                  className="col-span-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 md:col-span-1"
                >
                  Add Tax Type
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-white shadow">
              <h2 className="border-b border-gray-200 px-6 py-4 text-xl font-bold text-gray-900">
                Tax Types
              </h2>
              <div className="divide-y divide-gray-100">
                {taxTypes.length > 0 ? (
                  taxTypes.map((type) => (
                    <div key={type.id} className="flex items-start justify-between px-6 py-4">
                      <div>
                        <h3 className="font-medium text-gray-900">{type.name}</h3>
                        {type.description && (
                          <p className="text-sm text-gray-600">{type.description}</p>
                        )}
                        <div className="mt-1 flex gap-4 text-sm text-gray-500">
                          <span>
                            Default: {type.defaultPercentage}
                            {type.isPercentageBased ? "%" : ""}
                          </span>
                          <span>
                            Type: {type.isPercentageBased ? "Percentage" : "Fixed Amount"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-4 text-center text-gray-500">
                    No tax types created yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {tab === "bulk-apply" && (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-bold text-gray-900">Bulk Apply Taxes</h2>
              <p className="mb-4 text-sm text-gray-600">
                Apply multiple tax types to all employees at once. Configure different amounts and percentages for each tax type.
              </p>

              {/* Month/Year Selection */}
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month
                  </label>
                  <select
                    value={bulkTaxMonth}
                    onChange={(e) => setBulkTaxMonth(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-200 p-2 text-black"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString("default", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <select
                    value={bulkTaxYear}
                    onChange={(e) => setBulkTaxYear(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-200 p-2 text-black"
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <option key={i} value={new Date().getFullYear() - 2 + i}>
                        {new Date().getFullYear() - 2 + i}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tax Configurations */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Tax Configurations</h3>
                  <button
                    onClick={addBulkTaxConfig}
                    className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                  >
                    Add Tax Type
                  </button>
                </div>

                {bulkTaxConfigs.length === 0 ? (
                  <div className="rounded-md border-2 border-dashed border-gray-300 p-8 text-center">
                    <p className="text-gray-500">No tax configurations added yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Click "Add Tax Type" to configure taxes to apply
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bulkTaxConfigs.map((config, index) => (
                      <div key={index} className="rounded-md border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-900">Tax Configuration {index + 1}</h4>
                          <button
                            onClick={() => removeBulkTaxConfig(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tax Type
                            </label>
                            <select
                              value={config.taxType}
                              onChange={(e) => updateBulkTaxConfig(index, "taxType", e.target.value)}
                              className="w-full rounded-md border border-gray-200 p-2 text-black"
                            >
                              <option value="">Select Tax Type</option>
                              {taxTypes.map((type) => (
                                <option key={type.id} value={type.name}>
                                  {type.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fixed Amount (₹)
                            </label>
                            <input
                              type="number"
                              value={config.amount}
                              onChange={(e) => updateBulkTaxConfig(index, "amount", e.target.value)}
                              placeholder="0"
                              className="w-full rounded-md border border-gray-200 p-2 text-black"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Percentage (%)
                            </label>
                            <input
                              type="number"
                              value={config.percentage}
                              onChange={(e) => updateBulkTaxConfig(index, "percentage", e.target.value)}
                              placeholder="0"
                              className="w-full rounded-md border border-gray-200 p-2 text-black"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Remarks
                            </label>
                            <input
                              type="text"
                              value={config.remarks}
                              onChange={(e) => updateBulkTaxConfig(index, "remarks", e.target.value)}
                              placeholder="Optional remarks"
                              className="w-full rounded-md border border-gray-200 p-2 text-black"
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={config.applyToAll}
                              onChange={(e) => updateBulkTaxConfig(index, "applyToAll", e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Apply to all employees</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Apply Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleBulkApplyTaxes}
                  disabled={bulkApplying || bulkTaxConfigs.length === 0}
                  className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkApplying ? "Applying..." : "Apply Taxes to All Employees"}
                </button>
              </div>
            </div>
          </div>
        )}
        {tab === "manage-taxes" && (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-bold text-gray-900">Add Tax to Employee</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <select
                  value={newTax.userId}
                  onChange={(e) => setNewTax((prev) => ({ ...prev, userId: e.target.value }))}
                  className="rounded-md border border-gray-200 p-2 text-black"
                >
                  <option value="">Select Employee</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.employeeId})
                    </option>
                  ))}
                </select>
                <select
                  value={newTax.taxType}
                  onChange={(e) =>
                    setNewTax((prev) => ({ ...prev, taxType: e.target.value }))
                  }
                  className="rounded-md border border-gray-200 p-2 text-black"
                >
                  <option value="">Select Tax Type</option>
                  {taxTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  value={newTax.amount}
                  onChange={(e) => setNewTax((prev) => ({ ...prev, amount: e.target.value }))}
                  className="rounded-md border border-gray-200 p-2 text-black"
                />
                <input
                  type="number"
                  placeholder="Percentage (if applicable)"
                  value={newTax.percentage}
                  onChange={(e) =>
                    setNewTax((prev) => ({ ...prev, percentage: e.target.value }))
                  }
                  className="rounded-md border border-gray-200 p-2 text-black"
                />
                <select
                  value={newTax.month}
                  onChange={(e) =>
                    setNewTax((prev) => ({ ...prev, month: Number(e.target.value) }))
                  }
                  className="rounded-md border border-gray-200 p-2 text-black"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Month {m}
                    </option>
                  ))}
                </select>
                <select
                  value={newTax.year}
                  onChange={(e) =>
                    setNewTax((prev) => ({ ...prev, year: Number(e.target.value) }))
                  }
                  className="rounded-md border border-gray-200 p-2 text-black"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = new Date().getFullYear() - i;
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    );
                  })}
                </select>
                <input
                  type="text"
                  placeholder="Remarks"
                  value={newTax.remarks}
                  onChange={(e) => setNewTax((prev) => ({ ...prev, remarks: e.target.value }))}
                  className="rounded-md border border-gray-200 p-2 text-black md:col-span-2"
                />
                <button
                  onClick={handleAddTax}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 md:col-span-1"
                >
                  Add Tax
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg bg-white shadow">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Employee</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Tax Type</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">
                      Month/Year
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Remarks</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {taxes.length > 0 ? (
                    taxes.map((tax) => (
                      <tr key={tax.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900">{tax.user.name}</div>
                          <div className="text-xs text-gray-500">{tax.user.employeeId}</div>
                        </td>
                        <td className="px-4 py-2 text-gray-700">{tax.taxType}</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          ₹{tax.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-center text-gray-700">
                          {tax.month}/{tax.year}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{tax.remarks}</td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => handleDeleteTax(tax.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                        No taxes added yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
