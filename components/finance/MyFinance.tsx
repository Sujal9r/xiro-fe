"use client";

import { HydratedSalaryRecord } from "./types";
import PayslipCard from "./PayslipCard";
import SalaryBreakdownCard from "./SalaryBreakdownCard";
import TaxBreakdownCard from "./TaxBreakdownCard";
import { formatCurrency } from "./utils";

type MyFinanceProps = {
  record: HydratedSalaryRecord | null;
};

export default function MyFinance({ record }: MyFinanceProps) {
  if (!record) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">No finance record found</h2>
        <p className="mt-2 text-sm text-slate-500">
          Your payroll profile will appear here once the finance team publishes it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryCard label="Gross Salary" value={formatCurrency(record.grossSalary)} />
        <SummaryCard label="Net Salary" value={formatCurrency(record.netSalary)} accent />
        <SummaryCard label="Payment Status" value={record.paymentStatus} />
      </div>

      <PayslipCard record={record} scope="monthly" />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <SalaryBreakdownCard record={record} />
        {record.taxRows.length > 0 ? <TaxBreakdownCard record={record} /> : null}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className={`mt-3 text-2xl font-semibold ${accent ? "text-emerald-600" : "text-slate-900"}`}>
        {value}
      </div>
    </div>
  );
}
