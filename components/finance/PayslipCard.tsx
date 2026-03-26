"use client";

import { FinanceScope, HydratedSalaryRecord } from "./types";
import { formatCurrency, scopeLabel } from "./utils";

type PayslipCardProps = {
  record: HydratedSalaryRecord;
  scope: FinanceScope;
};

export default function PayslipCard({ record, scope }: PayslipCardProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-lg shadow-slate-200/70">
      <div className="bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] px-6 py-6 text-white">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.32em] text-sky-200">Xiro Payroll</div>
            <h3 className="mt-2 text-2xl font-semibold">Employee Payslip</h3>
            <p className="mt-1 text-sm text-sky-100">
              {record.employeeName} · {record.department}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
            <div className="text-sky-100">{scopeLabel(scope)}</div>
            <div className="mt-1 font-semibold">{record.employeeId}</div>
          </div>
        </div>
      </div>
      <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <LineItem label="Basic Salary" value={record.basicSalary} />
          <LineItem label="Bonus" value={record.bonus} />
          <LineItem label="Allowances" value={record.allowances} />
          <LineItem label="Gross Salary" value={record.grossSalary} strong />
          {record.taxRows.length > 0 ? (
            <LineItem label="Total Tax" value={record.totalTax} strong negative />
          ) : null}
          <LineItem label="Net Salary" value={record.netSalary} strong accent />
        </div>
        <div className="rounded-3xl bg-slate-50 p-5">
          <div className="text-sm font-semibold text-slate-900">Payment Overview</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniStat label="Status" value={record.paymentStatus} />
            <MiniStat label="Taxes" value={record.taxRows.length ? `${record.taxRows.length} active` : "None"} />
            <MiniStat label="Department" value={record.department} />
            <MiniStat label="Employee ID" value={record.employeeId} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LineItem({
  label,
  value,
  strong,
  negative,
  accent,
}: {
  label: string;
  value: number;
  strong?: boolean;
  negative?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
      <span className={`text-sm ${strong ? "font-semibold text-slate-900" : "text-slate-500"}`}>
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${
          accent ? "text-emerald-600" : negative ? "text-rose-600" : "text-slate-900"
        }`}
      >
        {negative ? "-" : ""}
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
