"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import apiCall from "../../../lib/api";

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

type SalaryChange = {
  id: string;
  previousSalary: number;
  newSalary: number;
  effectiveDate: string;
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export default function UserFinancePage() {
  const [payroll, setPayroll] = useState<PayrollRow | null>(null);
  const [history, setHistory] = useState<SalaryChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiCall("/api/finance/my");
        setPayroll(data.payroll);
        setHistory(data.history || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load finance data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalAdditions = useMemo(() => {
    if (!payroll) return 0;
    return payroll.benefits + payroll.reimbursement;
  }, [payroll]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !payroll) {
    return (
      <DashboardLayout>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "No payroll data available."}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Finance</h1>
          <p className="text-sm text-gray-500">
            View your payroll details and salary history.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Current salary</p>
            <p className="text-xl font-semibold text-gray-900">
              {currency(payroll.earnings)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Employee ID: {payroll.employeeId}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total additions</p>
            <p className="text-xl font-semibold text-gray-900">
              {currency(totalAdditions)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Benefits + Reimbursements</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Net pay</p>
            <p className="text-xl font-semibold text-gray-900">
              {currency(payroll.netPay)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Taxes + deductions applied
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Payroll breakdown</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                Earnings: <span className="font-medium">{currency(payroll.earnings)}</span>
              </p>
              <p>
                Taxes: <span className="font-medium">{currency(payroll.taxes)}</span>
              </p>
              <p>
                Deductions:{" "}
                <span className="font-medium">{currency(payroll.deductions)}</span>
              </p>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                Benefits: <span className="font-medium">{currency(payroll.benefits)}</span>
              </p>
              <p>
                Reimbursement:{" "}
                <span className="font-medium">{currency(payroll.reimbursement)}</span>
              </p>
              <p>
                Payment method:{" "}
                <span className="font-medium">{payroll.paymentMethod}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Salary history</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Previous</th>
                  <th className="px-4 py-3 text-left font-medium">New</th>
                  <th className="px-4 py-3 text-left font-medium">Increment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      No salary changes recorded yet.
                    </td>
                  </tr>
                )}
                {history.map((item) => {
                  const increment = item.newSalary - item.previousSalary;
                  return (
                    <tr key={item.id} className="text-gray-700">
                      <td className="px-4 py-3">
                        {new Date(item.effectiveDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3">{currency(item.previousSalary)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {currency(item.newSalary)}
                      </td>
                      <td className="px-4 py-3 text-green-600 font-medium">
                        {currency(increment)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
