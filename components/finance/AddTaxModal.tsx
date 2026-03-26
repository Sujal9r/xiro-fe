"use client";

import { FormEvent, useEffect, useState } from "react";
import Modal from "../Modal";
import { HydratedSalaryRecord, TaxDefinition, TaxDraft } from "./types";

type AddTaxModalProps = {
  open: boolean;
  record: HydratedSalaryRecord | null;
  taxDefinitions: TaxDefinition[];
  canManageTaxTypes: boolean;
  onClose: () => void;
  onSubmit: (draft: TaxDraft) => void;
};

const defaultDraft: TaxDraft = {
  mode: "existing",
  target: "selected",
  definitionId: "",
  customName: "",
  customType: "percentage",
  customValue: "",
  description: "",
  active: true,
};

export default function AddTaxModal({
  open,
  record,
  taxDefinitions,
  canManageTaxTypes,
  onClose,
  onSubmit,
}: AddTaxModalProps) {
  const [draft, setDraft] = useState<TaxDraft>(defaultDraft);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setDraft(defaultDraft);
      setError("");
    }
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (draft.mode === "existing" && !draft.definitionId) {
      setError("Select a tax type before applying.");
      return;
    }

    if (draft.mode === "custom") {
      if (!draft.customName.trim()) {
        setError("Custom tax name is required.");
        return;
      }

      if (!draft.customValue || Number(draft.customValue) <= 0) {
        setError("Enter a valid tax value.");
        return;
      }
    }

    setError("");
    onSubmit(draft);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={record ? `Add Tax · ${record.employeeName}` : "Add Tax"}
      description="Apply an existing tax or create a reusable custom deduction with validation."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionCard
            active={draft.mode === "existing"}
            title="Use Existing Tax"
            subtitle="Apply one of the reusable tax templates."
            onClick={() => setDraft((current) => ({ ...current, mode: "existing" }))}
          />
          <OptionCard
            active={draft.mode === "custom"}
            title="Create Custom Tax"
            subtitle={
              canManageTaxTypes
                ? "Create and apply a new tax type from this modal."
                : "Permission required to create new tax types."
            }
            disabled={!canManageTaxTypes}
            onClick={() => setDraft((current) => ({ ...current, mode: "custom" }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Apply To</label>
          <select
            value={draft.target}
            onChange={(event) =>
              setDraft((current) => ({ ...current, target: event.target.value as TaxDraft["target"] }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
          >
            <option value="selected">{record ? `Selected Employee · ${record.employeeName}` : "Selected Employee"}</option>
            <option value="all">All Employees</option>
          </select>
        </div>

        {draft.mode === "existing" ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tax Type</label>
            <select
              value={draft.definitionId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, definitionId: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
            >
              <option value="">Select Tax Type</option>
              {taxDefinitions.map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Tax Name"
              value={draft.customName}
              onChange={(value) => setDraft((current) => ({ ...current, customName: value }))}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tax Type</label>
              <select
                value={draft.customType}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    customType: event.target.value as TaxDraft["customType"],
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <Field
              label={draft.customType === "percentage" ? "Tax Value (%)" : "Tax Value"}
              value={draft.customValue}
              onChange={(value) => setDraft((current) => ({ ...current, customValue: value }))}
            />
            <div className="flex items-end">
              <label className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <span>Active Tax Type</span>
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, active: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                rows={3}
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
              />
            </div>
          </div>
        )}

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
            className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Apply Tax
          </button>
        </div>
      </form>
    </Modal>
  );
}

function OptionCard({
  active,
  title,
  subtitle,
  onClick,
  disabled,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl border px-4 py-4 text-left transition ${
        active
          ? "border-blue-500 bg-blue-50"
          : "border-slate-200 bg-white hover:border-slate-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</div>
    </button>
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
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
      />
    </div>
  );
}
