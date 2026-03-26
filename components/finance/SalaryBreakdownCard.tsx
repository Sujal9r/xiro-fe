"use client";

import { HydratedSalaryRecord } from "./types";
import { formatCurrency } from "./utils";

type SalaryBreakdownCardProps = {
  record: HydratedSalaryRecord;
};

export default function SalaryBreakdownCard({ record }: SalaryBreakdownCardProps) {
  const rows = [
    { label: "Basic Salary", value: record.basicSalary },
    { label: "Bonus", value: record.bonus },
    { label: "Allowances", value: record.allowances },
    { label: "Gross Salary", value: record.grossSalary, highlight: true },
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Salary Breakdown</h3>
          <p className="text-sm text-slate-500">Core compensation structure for this cycle.</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
              row.highlight ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700"
            }`}
          >
            <span className="text-sm font-medium">{row.label}</span>
            <span className="text-sm font-semibold">{formatCurrency(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
