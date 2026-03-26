"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import apiCall from "../../../lib/api";
import { PERMISSIONS, PermissionKey } from "../../../lib/permissions";
import { useAlert } from "../../../components/AlertProvider";

type PayrollRow = {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  earnings: number;
  taxes: number;
  reimbursement: number;
  benefits: number;
  deductions: number;
  netPay: number;
  paymentMethod: string;
  changePercent: number;
};

type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
};

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

type Employee = {
  _id: string;
  name: string;
  employeeId: string;
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export default function FinancePage() {
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const { showAlert } = useAlert();
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"payroll" | "expenses" | "taxes">("payroll");
  const [search, setSearch] = useState("");

  const [salaryTarget, setSalaryTarget] = useState<PayrollRow | null>(null);
  const [salaryInput, setSalaryInput] = useState("");
  const [savingSalary, setSavingSalary] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "General",
    amount: "",
    date: "",
    notes: "",
  });
  const [savingExpense, setSavingExpense] = useState(false);

  // Tax management state
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [taxTab, setTaxTab] = useState<"manage-taxes" | "bulk-apply" | "tax-types">("manage-taxes");

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, payrollData, expenseData] = await Promise.all([
        apiCall("/api/auth/me"),
        apiCall("/api/finance/payroll"),
        apiCall("/api/finance/expenses"),
      ]);
      setPermissions((me.permissions || []) as PermissionKey[]);
      setPayroll((payrollData.items || payrollData) as PayrollRow[]);
      setExpenses((expenseData.items || expenseData) as Expense[]);

      // Fetch tax data if user has tax permissions
      if (me.permissions?.includes(PERMISSIONS.FINANCE_TAX_VIEW)) {
        try {
          const [typesData, taxesData, usersData] = await Promise.all([
            apiCall("/api/finance/tax-types"),
            apiCall("/api/finance/taxes"),
            apiCall("/api/employees"),
          ]);
          setTaxTypes(typesData.items || []);
          setTaxes(taxesData.items || []);
          setEmployees(usersData.items || usersData || []);
        } catch (taxError) {
          // Tax data loading failed, but don't break the main page
          console.warn("Failed to load tax data:", taxError);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  const canManageExpenses = permissions.includes(PERMISSIONS.MANAGE_EXPENSES);
  const canManagePayroll = permissions.includes(PERMISSIONS.VIEW_ADMIN_FINANCE);

  const filteredPayroll = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payroll;
    return payroll.filter((row) => {
      return (
        row.name.toLowerCase().includes(q) ||
        row.employeeId.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q)
      );
    });
  }, [payroll, search]);

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, item) => sum + (item.amount || 0), 0),
    [expenses],
  );

  const handleStartSalaryEdit = (row: PayrollRow) => {
    setSalaryTarget(row);
    setSalaryInput(row.earnings.toString());
  };

  const handleSaveSalary = async () => {
    if (!salaryTarget) return;
    const nextSalary = Number(salaryInput);
    if (!Number.isFinite(nextSalary) || nextSalary <= 0) {
      showAlert("Enter a valid salary amount");
      return;
    }
    setSavingSalary(true);
    try {
      const updated = await apiCall(`/api/finance/payroll/${salaryTarget.id}/salary`, {
        method: "PUT",
        body: JSON.stringify({ salary: nextSalary }),
      });
      setPayroll((prev) =>
        prev.map((row) => (row.id === salaryTarget.id ? { ...row, ...updated } : row)),
      );
      setSalaryTarget(null);
    } catch (err: any) {
      showAlert(err?.message || "Failed to update salary");
    } finally {
      setSavingSalary(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.title.trim()) {
      showAlert("Expense title is required");
      return;
    }
    const amount = Number(expenseForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showAlert("Enter a valid amount");
      return;
    }
    setSavingExpense(true);
    try {
      const created = await apiCall("/api/finance/expenses", {
        method: "POST",
        body: JSON.stringify({
          title: expenseForm.title.trim(),
          category: expenseForm.category,
          amount,
          date: expenseForm.date || new Date().toISOString(),
          notes: expenseForm.notes.trim(),
        }),
      });
      setExpenses((prev) => [created, ...prev]);
      setExpenseForm({
        title: "",
        category: "General",
        amount: "",
        date: "",
        notes: "",
      });
      setTab("expenses");
    } catch (err: any) {
      showAlert(err?.message || "Failed to add expense");
    } finally {
      setSavingExpense(false);
    }
  };

  // Tax management functions
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
      // Refresh tax data
      const taxesData = await apiCall("/api/finance/taxes");
      setTaxes(taxesData.items || []);
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
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Finance</h1>
            <p className="text-sm text-gray-500">
              Manage payroll, salaries, and expenses.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTab("payroll")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === "payroll"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Payroll
            </button>
            <button
              onClick={() => setTab("expenses")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === "expenses"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Expenses
            </button>
            {permissions.includes(PERMISSIONS.FINANCE_TAX_VIEW) && (
              <button
                onClick={() => setTab("taxes")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  tab === "taxes"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Taxes
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {tab === "payroll" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-gray-600">
                Employees: <span className="font-semibold">{payroll.length}</span>
              </div>
              <div className="w-full md:w-72">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employees..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            </div>

            {salaryTarget && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Update salary for</p>
                    <p className="font-semibold text-gray-900">{salaryTarget.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      value={salaryInput}
                      onChange={(e) => setSalaryInput(e.target.value)}
                      className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      placeholder="Salary"
                    />
                    <button
                      onClick={handleSaveSalary}
                      disabled={savingSalary}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {savingSalary ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setSalaryTarget(null)}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Employee ID</th>
                      <th className="px-4 py-3 text-left font-medium">Employee</th>
                      <th className="px-4 py-3 text-left font-medium">Earnings</th>
                      <th className="px-4 py-3 text-left font-medium">Taxes</th>
                      <th className="px-4 py-3 text-left font-medium">Reimbursements</th>
                      <th className="px-4 py-3 text-left font-medium">Benefits</th>
                      <th className="px-4 py-3 text-left font-medium">Deductions</th>
                      <th className="px-4 py-3 text-left font-medium">Net Pay</th>
                      <th className="px-4 py-3 text-left font-medium">Payment</th>
                      <th className="px-4 py-3 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayroll.length === 0 && (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-4 py-6 text-center text-gray-500"
                        >
                          No payroll data available.
                        </td>
                      </tr>
                    )}
                    {filteredPayroll.map((row) => (
                      <tr key={row.id} className="text-gray-700">
                        <td className="px-4 py-3">{row.employeeId}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{row.name}</div>
                          <div className="text-xs text-gray-500">{row.role}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">
                            {currency(row.earnings)}
                          </div>
                          <div className="text-xs text-green-600">
                            change {row.changePercent}%
                          </div>
                        </td>
                        <td className="px-4 py-3">{currency(row.taxes)}</td>
                        <td className="px-4 py-3">{currency(row.reimbursement)}</td>
                        <td className="px-4 py-3">{currency(row.benefits)}</td>
                        <td className="px-4 py-3">{currency(row.deductions)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {currency(row.netPay)}
                        </td>
                        <td className="px-4 py-3">{row.paymentMethod}</td>
                        <td className="px-4 py-3">
                          <button
                            disabled={!canManagePayroll}
                            onClick={() => handleStartSalaryEdit(row)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                          >
                            Set salary
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "expenses" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs text-gray-500">Total expenses</p>
                <p className="text-xl font-semibold text-gray-900">
                  {currency(totalExpenses)}
                </p>
              </div>
            </div>

            {canManageExpenses && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">Add expense</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <input
                    value={expenseForm.title}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Title"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <input
                    value={expenseForm.category}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    placeholder="Category"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <input
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="Amount"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <input
                    value={expenseForm.notes}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Notes"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
                  />
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleAddExpense}
                    disabled={savingExpense}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingExpense ? "Saving..." : "Add expense"}
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Title</th>
                      <th className="px-4 py-3 text-left font-medium">Category</th>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Amount</th>
                      <th className="px-4 py-3 text-left font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenses.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-gray-500"
                        >
                          No expenses recorded yet.
                        </td>
                      </tr>
                    )}
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="text-gray-700">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {expense.title}
                        </td>
                        <td className="px-4 py-3">{expense.category}</td>
                        <td className="px-4 py-3">
                          {new Date(expense.date).toLocaleDateString("en-US")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {currency(expense.amount)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {expense.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "taxes" && (
          <div className="space-y-6">
            {/* Tax Sub-tabs */}
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setTaxTab("manage-taxes")}
                className={`px-4 py-2 font-medium ${
                  taxTab === "manage-taxes"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600"
                }`}
              >
                Manage Taxes
              </button>
              <button
                onClick={() => setTaxTab("bulk-apply")}
                className={`px-4 py-2 font-medium ${
                  taxTab === "bulk-apply"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600"
                }`}
              >
                Bulk Apply Taxes
              </button>
              <button
                onClick={() => setTaxTab("tax-types")}
                className={`px-4 py-2 font-medium ${
                  taxTab === "tax-types"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600"
                }`}
              >
                Tax Types
              </button>
            </div>

            {taxTab === "manage-taxes" && (
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
                      {employees.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.name} ({user.employeeId})
                        </option>
                      ))}
                    </select>
                    <select
                      value={newTax.taxType}
                      onChange={(e) => setNewTax((prev) => ({ ...prev, taxType: e.target.value }))}
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
                      placeholder="Amount (₹)"
                      value={newTax.amount}
                      onChange={(e) => setNewTax((prev) => ({ ...prev, amount: e.target.value }))}
                      className="rounded-md border border-gray-200 p-2 text-black"
                    />
                    <input
                      type="number"
                      placeholder="Percentage (%)"
                      value={newTax.percentage}
                      onChange={(e) => setNewTax((prev) => ({ ...prev, percentage: e.target.value }))}
                      className="rounded-md border border-gray-200 p-2 text-black"
                    />
                    <select
                      value={newTax.month}
                      onChange={(e) => setNewTax((prev) => ({ ...prev, month: Number(e.target.value) }))}
                      className="rounded-md border border-gray-200 p-2 text-black"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(0, i).toLocaleString("default", { month: "long" })}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newTax.year}
                      onChange={(e) => setNewTax((prev) => ({ ...prev, year: Number(e.target.value) }))}
                      className="rounded-md border border-gray-200 p-2 text-black"
                    >
                      {Array.from({ length: 5 }, (_, i) => (
                        <option key={i} value={new Date().getFullYear() - 2 + i}>
                          {new Date().getFullYear() - 2 + i}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Remarks (optional)"
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
                        <th className="px-4 py-3 text-center font-medium text-gray-700">Month/Year</th>
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

            {taxTab === "bulk-apply" && (
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

            {taxTab === "tax-types" && (
              <div className="space-y-6">
                <div className="rounded-lg bg-white p-6 shadow">
                  <h2 className="mb-4 text-xl font-bold text-gray-900">Create Tax Type</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Tax Type Name (e.g., Income Tax)"
                      value={newTaxType.name}
                      onChange={(e) => setNewTaxType((prev) => ({ ...prev, name: e.target.value }))}
                      className="rounded-md border border-gray-200 p-2 text-black"
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={newTaxType.description}
                      onChange={(e) => setNewTaxType((prev) => ({ ...prev, description: e.target.value }))}
                      className="rounded-md border border-gray-200 p-2 text-black"
                    />
                    <input
                      type="number"
                      placeholder="Default Percentage (optional)"
                      value={newTaxType.defaultPercentage}
                      onChange={(e) => setNewTaxType((prev) => ({ ...prev, defaultPercentage: Number(e.target.value) }))}
                      className="rounded-md border border-gray-200 p-2 text-black"
                    />
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newTaxType.isPercentageBased}
                        onChange={(e) => setNewTaxType((prev) => ({ ...prev, isPercentageBased: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label className="ml-2 text-sm text-gray-700">Percentage-based tax</label>
                    </div>
                    <button
                      onClick={handleAddTaxType}
                      className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 md:col-span-2"
                    >
                      Create Tax Type
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg bg-white shadow">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Description</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-700">Type</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-700">Default %</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {taxTypes.length > 0 ? (
                        taxTypes.map((type) => (
                          <tr key={type.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium text-gray-900">{type.name}</td>
                            <td className="px-4 py-2 text-gray-700">{type.description || "-"}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                type.isPercentageBased ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                              }`}>
                                {type.isPercentageBased ? "Percentage" : "Fixed"}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center text-gray-700">
                              {type.defaultPercentage > 0 ? `${type.defaultPercentage}%` : "-"}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                Active
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                            No tax types created yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
