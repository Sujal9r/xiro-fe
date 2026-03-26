"use client";

import { HydratedSalaryRecord } from "./types";
import { formatCurrency, paymentStatusTone } from "./utils";

type SalaryTableProps = {
  records: HydratedSalaryRecord[];
  canEditSalary: boolean;
  canAddTax: boolean;
  canRemoveTax: boolean;
  canGeneratePayslip: boolean;
  onViewBreakdown: (record: HydratedSalaryRecord) => void;
  onEditSalary: (record: HydratedSalaryRecord) => void;
  onAddTax: (record: HydratedSalaryRecord) => void;
  onRemoveTax: (record: HydratedSalaryRecord) => void;
  onGeneratePayslip: (record: HydratedSalaryRecord) => void;
};

export default function SalaryTable({
  records,
  canEditSalary,
  canAddTax,
  canRemoveTax,
  canGeneratePayslip,
  onViewBreakdown,
  onEditSalary,
  onAddTax,
  onRemoveTax,
  onGeneratePayslip,
}: SalaryTableProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
            <tr>
              {[
                "Employee Name",
                "Employee ID",
                "Department",
                "Basic Salary",
                "Gross Salary",
                "Total Tax",
                "Net Salary",
                "Payment Status",
                "Actions",
              ].map((header) => (
                <th
                  key={header}
                  className="border-b border-slate-200 px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-20 text-center text-slate-500">
                  No payroll records match the current filters.
                </td>
              </tr>
            ) : null}
            {records.map((record) => (
              <tr key={record.id} className="align-top transition hover:bg-slate-50/80">
                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-900">{record.employeeName}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {record.taxRows.length > 0
                      ? `${record.taxRows.length} active deduction${record.taxRows.length > 1 ? "s" : ""}`
                      : "No active deductions"}
                  </div>
                </td>
                <td className="px-4 py-4 font-medium text-slate-600">{record.employeeId}</td>
                <td className="px-4 py-4 text-slate-600">{record.department}</td>
                <td className="px-4 py-4 font-medium text-slate-900">
                  {formatCurrency(record.basicSalary)}
                </td>
                <td className="px-4 py-4 font-medium text-slate-900">
                  {formatCurrency(record.grossSalary)}
                </td>
                <td className="px-4 py-4 font-medium text-rose-600">
                  {formatCurrency(record.totalTax)}
                </td>
                <td className="px-4 py-4 font-semibold text-emerald-600">
                  {formatCurrency(record.netSalary)}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${paymentStatusTone(
                      record.paymentStatus,
                    )}`}
                  >
                    {record.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      label="View Breakdown"
                      variant="neutral"
                      onClick={() => onViewBreakdown(record)}
                    />
                    {canEditSalary ? (
                      <ActionButton
                        label="Edit Salary"
                        variant="dark"
                        onClick={() => onEditSalary(record)}
                      />
                    ) : null}
                    {canAddTax ? (
                      <ActionButton
                        label="Add Tax"
                        variant="blue"
                        onClick={() => onAddTax(record)}
                      />
                    ) : null}
                    {canRemoveTax ? (
                      <ActionButton
                        label="Remove Tax"
                        variant="rose"
                        disabled={record.taxRows.length === 0}
                        onClick={() => onRemoveTax(record)}
                      />
                    ) : null}
                    {canGeneratePayslip ? (
                      <ActionButton
                        label="Generate Payslip"
                        variant="emerald"
                        onClick={() => onGeneratePayslip(record)}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  variant,
  disabled,
}: {
  label: string;
  onClick: () => void;
  variant: "neutral" | "dark" | "blue" | "rose" | "emerald";
  disabled?: boolean;
}) {
  const styles = {
    neutral: "border-slate-200 text-slate-700 hover:bg-slate-100",
    dark: "border-slate-900 bg-slate-900 text-white hover:bg-slate-800",
    blue: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    emerald: "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
  }[variant];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${styles} ${
        disabled ? "cursor-not-allowed opacity-40" : ""
      }`}
    >
      {label}
    </button>
  );
}
