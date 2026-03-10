"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import LeavesNav from "../../../components/LeavesNav";
import apiCall from "../../../lib/api";

interface Balance {
  key: string;
  name: string;
  total: number;
  used: number;
  remaining: number;
}

interface HistoryItem {
  _id: string;
  typeName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
}

export default function LeaveBalancePage() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const data = await apiCall("/api/leaves/balance");
      setBalances(data.balances || []);
      setHistory(data.history || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

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
        <h1 className="text-3xl font-bold text-gray-900">Leave Balance</h1>
        <LeavesNav currentPath="/leaves/balance" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {balances.map((balance) => (
            <div key={balance.key} className="bg-white rounded-lg shadow p-5">
              <div className="text-sm text-gray-600">{balance.name}</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {balance.remaining}
              </div>
              <div className="text-xs text-gray-500">
                Used {balance.used} / {balance.total}
              </div>
            </div>
          ))}
          {balances.length === 0 && (
            <div className="text-gray-500">No leave balances configured.</div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Leave History</h2>
          </div>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Days
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((item) => (
                  <tr key={item._id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.typeName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(item.fromDate)} - {formatDate(item.toDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.totalDays}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-gray-500">
                      No leave history yet.
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
