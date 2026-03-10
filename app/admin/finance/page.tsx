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
  const [tab, setTab] = useState<"payroll" | "expenses">("payroll");
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
      </div>
    </DashboardLayout>
  );
}
