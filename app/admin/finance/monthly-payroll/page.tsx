"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import apiCall from "../../../../lib/api";
import { useAlert } from "../../../../components/AlertProvider";

type PayrollItem = {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  salary: number;
  autoCalculatedTax: number;
  manualTaxes: Array<{ type: string; amount: number }>;
  totalTax: number;
  benefits: number;
  deductions: number;
  reimbursement: number;
  netPay: number;
  paymentMethod: string;
};

type PayrollSummary = {
  month: number;
  year: number;
  totalEmployees: number;
  totalSalary: number;
  totalTax: number;
  totalBenefits: number;
  totalDeductions: number;
  totalReimbursement: number;
  totalNetPay: number;
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function MonthlyPayrollPage() {
  const { showAlert } = useAlert();
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [payroll, setPayroll] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    fetchPayroll();
  }, [month]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const [year, monthNum] = month.split("-").map(Number);
      const data = await apiCall(
        `/api/finance/payroll/monthly?month=${monthNum}&year=${year}`
      );
      setSummary(data.summary);
      setPayroll(data.payroll || []);
    } catch (error: any) {
      showAlert(error?.message || "Failed to fetch monthly payroll");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!summary || payroll.length === 0) {
      showAlert("No payroll data to export");
      return;
    }

    const csv = [
      [`Monthly Payroll Report - ${monthNames[summary.month - 1]} ${summary.year}`],
      [],
      [
        "Employee ID",
        "Name",
        "Role",
        "Salary",
        "Tax (Auto)",
        "Manual Taxes",
        "Total Tax",
        "Benefits",
        "Deductions",
        "Reimbursement",
        "Net Pay",
      ],
      ...payroll.map((item) => [
        item.employeeId,
        item.name,
        item.role,
        item.salary,
        item.autoCalculatedTax,
        item.manualTaxes.map((t) => `${t.type}:${t.amount}`).join("|"),
        item.totalTax,
        item.benefits,
        item.deductions,
        item.reimbursement,
        item.netPay,
      ]),
      [],
      ["SUMMARY"],
      ["Total Employees", summary.totalEmployees],
      ["Total Salary", summary.totalSalary],
      ["Total Tax", summary.totalTax],
      ["Total Benefits", summary.totalBenefits],
      ["Total Deductions", summary.totalDeductions],
      ["Total Reimbursement", summary.totalReimbursement],
      ["Total Net Pay", summary.totalNetPay],
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${month}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Monthly Payroll Report</h1>
          <div className="flex gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-md border border-gray-200 p-2 text-black"
            />
            <button
              onClick={handleExport}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Export CSV
            </button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-sm text-gray-600">Total Employees</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                {summary.totalEmployees}
              </div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-sm text-gray-600">Total Salary</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                {currency(summary.totalSalary)}
              </div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-sm text-gray-600">Total Tax</div>
              <div className="mt-1 text-2xl font-bold text-red-600">
                {currency(summary.totalTax)}
              </div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-sm text-gray-600">Total Net Pay</div>
              <div className="mt-1 text-2xl font-bold text-green-600">
                {currency(summary.totalNetPay)}
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Employee ID
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Role</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Salary</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Tax</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">
                  Benefits
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">
                  Deductions
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">
                  Net Pay
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payroll.length > 0 ? (
                payroll.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">{item.employeeId}</td>
                    <td className="px-4 py-2 text-gray-900">{item.name}</td>
                    <td className="px-4 py-2 text-gray-600">{item.role}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      {currency(item.salary)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-red-600">
                      {currency(item.totalTax)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-green-600">
                      {currency(item.benefits)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-orange-600">
                      {currency(item.deductions)}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-gray-900">
                      {currency(item.netPay)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-gray-500">
                    No payroll data available
                  </td>
                </tr>
              )}
            </tbody>
            {summary && (
              <tfoot className="border-t border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 font-bold text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {currency(summary.totalSalary)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">
                    {currency(summary.totalTax)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">
                    {currency(summary.totalBenefits)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-orange-600">
                    {currency(summary.totalDeductions)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {currency(summary.totalNetPay)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
