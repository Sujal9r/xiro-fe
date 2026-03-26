"use client";

import { FormEvent, useEffect, useState } from "react";
import Modal from "../Modal";
import { HydratedSalaryRecord, SalaryEditDraft } from "./types";

type EditSalaryModalProps = {
  open: boolean;
  record: HydratedSalaryRecord | null;
  onClose: () => void;
  onSubmit: (draft: SalaryEditDraft) => void;
};

const emptyDraft: SalaryEditDraft = {
  basicSalary: "",
  bonus: "",
  allowances: "",
  paymentStatus: "Pending",
};

export default function EditSalaryModal({
  open,
  record,
  onClose,
  onSubmit,
}: EditSalaryModalProps) {
  const [draft, setDraft] = useState<SalaryEditDraft>(emptyDraft);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!record) {
      setDraft(emptyDraft);
      return;
    }

    setDraft({
      basicSalary: String(record.basicSalary),
      bonus: String(record.bonus),
      allowances: String(record.allowances),
      paymentStatus: record.paymentStatus,
    });
    setError("");
  }, [record]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      Number(draft.basicSalary) < 0 ||
      Number(draft.bonus) < 0 ||
      Number(draft.allowances) < 0
    ) {
      setError("Salary values cannot be negative.");
      return;
    }

    setError("");
    onSubmit(draft);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={record ? `Edit Salary · ${record.employeeName}` : "Edit Salary"}
      description="Adjust base pay, incentives, and current payment status."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field
          label="Basic Salary"
          value={draft.basicSalary}
          onChange={(value) => setDraft((current) => ({ ...current, basicSalary: value }))}
        />
        <Field
          label="Bonus"
          value={draft.bonus}
          onChange={(value) => setDraft((current) => ({ ...current, bonus: value }))}
        />
        <Field
          label="Allowances"
          value={draft.allowances}
          onChange={(value) => setDraft((current) => ({ ...current, allowances: value }))}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Payment Status</label>
          <select
            value={draft.paymentStatus}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                paymentStatus: event.target.value as SalaryEditDraft["paymentStatus"],
              }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-400"
          >
            <option value="Paid">Paid</option>
            <option value="Processing">Processing</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Save Salary
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-400"
      />
    </div>
  );
}
