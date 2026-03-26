"use client";

import { HydratedSalaryRecord } from "./types";
import { formatCurrency, taxModeLabel } from "./utils";

type TaxBreakdownCardProps = {
  record: HydratedSalaryRecord;
};

export default function TaxBreakdownCard({ record }: TaxBreakdownCardProps) {
  if (record.taxRows.length === 0) return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Tax Breakdown</h3>
        <p className="text-sm text-slate-500">
          Deductions are only shown when they exist to keep the payslip clean.
        </p>
      </div>
      <div className="mt-5 space-y-3">
        {record.taxRows.map((tax) => (
          <div
            key={tax.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">{tax.name}</div>
                <div className="text-xs text-slate-500">
                  {taxModeLabel(tax.type)} · {tax.type === "percentage" ? `${tax.value}%` : formatCurrency(tax.value)}
                </div>
              </div>
              <div className="text-sm font-semibold text-rose-600">
                -{formatCurrency(tax.calculatedAmount)}
              </div>
            </div>
            {tax.description ? (
              <p className="mt-2 text-xs leading-5 text-slate-500">{tax.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
