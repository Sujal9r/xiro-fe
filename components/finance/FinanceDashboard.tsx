"use client";

import { useMemo, useState } from "react";
import { HiOutlineBadgeCheck, HiOutlineClipboardList, HiOutlineCash, HiOutlineDocumentText, HiOutlineShieldCheck } from "react-icons/hi";
import { PermissionKey, PERMISSIONS } from "../../lib/permissions";
import AddTaxModal from "./AddTaxModal";
import EditSalaryModal from "./EditSalaryModal";
import { financeSalaryRecordsSeed, financeTaxDefinitionsSeed } from "./mockData";
import SalaryDetailsModal from "./SalaryDetailsModal";
import SalaryTable from "./SalaryTable";
import { FinanceScope, FinanceSection, HydratedSalaryRecord, SalaryEditDraft, SalaryRecord, TaxDefinition, TaxDraft } from "./types";
import { buildAppliedTax, buildSalarySummary, formatCurrency, hydrateSalaryRecord, scopeLabel, taxModeLabel } from "./utils";

type FinanceDashboardProps = {
  permissions: PermissionKey[];
  initialSection?: FinanceSection;
  initialScope?: FinanceScope;
  title?: string;
  subtitle?: string;
  onNotify?: (message: string) => void;
};

export default function FinanceDashboard({
  permissions,
  initialSection = "payroll",
  initialScope = "monthly",
  title = "Finance",
  subtitle = "Professional payroll operations with permission-based controls and reusable finance workflows.",
  onNotify,
}: FinanceDashboardProps) {
  const [section, setSection] = useState<FinanceSection>(initialSection);
  const [scope, setScope] = useState<FinanceScope>(initialScope);
  const [query, setQuery] = useState("");
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>(financeSalaryRecordsSeed);
  const [taxDefinitions, setTaxDefinitions] = useState<TaxDefinition[]>(financeTaxDefinitionsSeed);
  const [selectedRecord, setSelectedRecord] = useState<HydratedSalaryRecord | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<HydratedSalaryRecord | null>(null);
  const [editRecord, setEditRecord] = useState<HydratedSalaryRecord | null>(null);
  const [addTaxRecord, setAddTaxRecord] = useState<HydratedSalaryRecord | null>(null);
  const [taxForm, setTaxForm] = useState({
    name: "",
    type: "percentage" as TaxDefinition["type"],
    value: "",
    description: "",
    active: true,
  });

  const canViewFinance = permissions.includes(PERMISSIONS.VIEW_ADMIN_FINANCE);
  const canManageTaxLibrary = permissions.includes(PERMISSIONS.FINANCE_TAX_TYPE_MANAGE);
  const canAddTax = permissions.includes(PERMISSIONS.FINANCE_TAX_ADD);
  const canRemoveTax = permissions.includes(PERMISSIONS.FINANCE_TAX_DELETE);
  const canEditSalary = permissions.includes(PERMISSIONS.FINANCE_PAYROLL_EDIT);
  const canGeneratePayslip = permissions.includes(PERMISSIONS.FINANCE_PAYSLIP_GENERATE);

  const hydratedRecords = useMemo(
    () => salaryRecords.map((record) => hydrateSalaryRecord(record, scope)),
    [salaryRecords, scope],
  );

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return hydratedRecords;

    return hydratedRecords.filter((record) => {
      return (
        record.employeeName.toLowerCase().includes(normalized) ||
        record.employeeId.toLowerCase().includes(normalized) ||
        record.department.toLowerCase().includes(normalized)
      );
    });
  }, [hydratedRecords, query]);

  const summary = useMemo(() => buildSalarySummary(filteredRecords), [filteredRecords]);

  const visiblePermissions = [
    {
      label: "Payroll Edit",
      enabled: canEditSalary,
    },
    {
      label: "Tax Apply",
      enabled: canAddTax,
    },
    {
      label: "Tax Customize",
      enabled: canManageTaxLibrary,
    },
    {
      label: "Payslip Generate",
      enabled: canGeneratePayslip,
    },
  ];

  const notify = (message: string) => {
    if (onNotify) onNotify(message);
  };

  const syncSelectedRecord = (recordId: string | null) => {
    if (!recordId) return null;
    return hydrateSalaryRecord(
      salaryRecords.find((item) => item.id === recordId) || financeSalaryRecordsSeed[0],
      scope,
    );
  };

  const handleEditSalary = (draft: SalaryEditDraft) => {
    if (!editRecord) return;

    // TODO: Replace local mutation with a backend payroll update API call.
    setSalaryRecords((current) =>
      current.map((record) =>
        record.id === editRecord.id
          ? {
              ...record,
              basicSalary: Number(draft.basicSalary),
              bonus: Number(draft.bonus),
              allowances: Number(draft.allowances),
              paymentStatus: draft.paymentStatus,
            }
          : record,
      ),
    );
    notify("Salary record updated.");
    setEditRecord(null);
  };

  const handleApplyTax = (draft: TaxDraft) => {
    let nextDefinition: TaxDefinition | null = null;

    if (draft.mode === "custom") {
      nextDefinition = {
        id: `tax-${Date.now()}`,
        name: draft.customName.trim(),
        type: draft.customType,
        value: Number(draft.customValue),
        description: draft.description.trim(),
        active: draft.active,
      };

      if (canManageTaxLibrary) {
        // TODO: Persist custom tax type with a backend tax-definition API when available.
        setTaxDefinitions((current) => [nextDefinition as TaxDefinition, ...current]);
      }
    } else {
      nextDefinition = taxDefinitions.find((definition) => definition.id === draft.definitionId) || null;
    }

    if (!nextDefinition) {
      notify("Select a valid tax definition.");
      return;
    }

    // TODO: Replace local payroll tax application with backend employee-tax assignment APIs.
    setSalaryRecords((current) =>
      current.map((record) => {
        if (draft.target === "selected" && addTaxRecord && record.id !== addTaxRecord.id) {
          return record;
        }

        return {
          ...record,
          taxes: [
            ...record.taxes,
            buildAppliedTax(nextDefinition as TaxDefinition, {
              id: `${record.id}-${nextDefinition?.id}-${Date.now()}`,
            }),
          ],
        };
      }),
    );

    notify(
      draft.target === "all"
        ? `${nextDefinition.name} applied to all employees.`
        : `${nextDefinition.name} applied to ${addTaxRecord?.employeeName}.`,
    );
    setAddTaxRecord(null);
  };

  const handleRemoveTax = (record: HydratedSalaryRecord) => {
    if (record.taxRows.length === 0) {
      notify("No tax deduction found on this employee.");
      return;
    }

    const removable = record.taxRows[record.taxRows.length - 1];

    // TODO: Replace local removal with a backend delete tax assignment API.
    setSalaryRecords((current) =>
      current.map((item) =>
        item.id === record.id
          ? { ...item, taxes: item.taxes.filter((tax) => tax.id !== removable.id) }
          : item,
      ),
    );
    notify(`${removable.name} removed from ${record.employeeName}.`);
  };

  const handleGeneratePayslip = (record: HydratedSalaryRecord) => {
    setSelectedRecord(record);
    setDetailsRecord(record);
    notify(`Payslip preview ready for ${record.employeeName}.`);
  };

  const handleCreateTaxDefinition = () => {
    if (!taxForm.name.trim() || Number(taxForm.value) <= 0) {
      notify("Tax name and a positive value are required.");
      return;
    }

    // TODO: Replace local tax-library creation with a backend finance tax settings API.
    setTaxDefinitions((current) => [
      {
        id: `library-${Date.now()}`,
        name: taxForm.name.trim(),
        type: taxForm.type,
        value: Number(taxForm.value),
        description: taxForm.description.trim(),
        active: taxForm.active,
      },
      ...current,
    ]);
    setTaxForm({
      name: "",
      type: "percentage",
      value: "",
      description: "",
      active: true,
    });
    notify("Tax library updated.");
  };

  if (!canViewFinance) {
    return (
      <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-10 text-amber-900">
        <h2 className="text-xl font-semibold">Finance access is restricted</h2>
        <p className="mt-2 text-sm text-amber-800">
          This module is fully permission based. Grant `view.admin.finance` to open payroll operations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.7),_transparent_30%),linear-gradient(135deg,#f8fafc,#eef2ff_60%,#e2e8f0)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 backdrop-blur">
              <HiOutlineShieldCheck className="h-4 w-4" />
              Permission-Based Finance
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px]">
            {visiblePermissions.map((item) => (
              <div
                key={item.label}
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  item.enabled
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                <div className="font-semibold">{item.label}</div>
                <div className="mt-1 text-xs">{item.enabled ? "Enabled" : "Disabled"}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<HiOutlineCash className="h-5 w-5" />}
          label="Total Salary Payout"
          value={formatCurrency(summary.totalSalaryPayout)}
        />
        <SummaryCard
          icon={<HiOutlineDocumentText className="h-5 w-5" />}
          label="Total Tax Deducted"
          value={formatCurrency(summary.totalTaxDeducted)}
        />
        <SummaryCard
          icon={<HiOutlineBadgeCheck className="h-5 w-5" />}
          label="Paid Employees"
          value={String(summary.paidEmployees)}
        />
        <SummaryCard
          icon={<HiOutlineClipboardList className="h-5 w-5" />}
          label="Pending Payments"
          value={String(summary.pendingPayments)}
        />
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "payroll", label: "Payroll" },
            { id: "taxes", label: "Tax Studio" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id as FinanceSection)}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                section === item.id
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            {(["monthly", "annual"] as FinanceScope[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  scope === value ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {value === "annual" ? "Annual" : "Monthly"}
              </button>
            ))}
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search employee, ID, department"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 sm:w-80"
          />
        </div>
      </div>

      {section === "payroll" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.95fr)]">
          <SalaryTable
            records={filteredRecords}
            canEditSalary={canEditSalary}
            canAddTax={canAddTax}
            canRemoveTax={canRemoveTax}
            canGeneratePayslip={canGeneratePayslip}
            onViewBreakdown={(record) => {
              setSelectedRecord(record);
              setDetailsRecord(record);
            }}
            onEditSalary={(record) => {
              setSelectedRecord(record);
              setEditRecord(record);
            }}
            onAddTax={(record) => {
              setSelectedRecord(record);
              setAddTaxRecord(record);
            }}
            onRemoveTax={handleRemoveTax}
            onGeneratePayslip={handleGeneratePayslip}
          />

          <aside className="space-y-6">
            <PanelCard
              title={scopeLabel(scope)}
              description="Operational snapshot for the currently filtered payroll view."
            >
              <div className="space-y-3">
                {filteredRecords.slice(0, 3).map((record) => (
                  <div key={record.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{record.employeeName}</div>
                        <div className="text-xs text-slate-500">{record.department}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-emerald-600">
                          {formatCurrency(record.netSalary)}
                        </div>
                        <div className="text-xs text-slate-500">{record.paymentStatus}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>

            <PanelCard
              title="Tax Library"
              description="Reusable deductions that can be applied employee-wise or globally."
            >
              <div className="space-y-3">
                {taxDefinitions.map((definition) => (
                  <div
                    key={definition.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{definition.name}</div>
                        <div className="text-xs text-slate-500">
                          {taxModeLabel(definition.type)} ·{" "}
                          {definition.type === "percentage"
                            ? `${definition.value}%`
                            : formatCurrency(definition.value)}
                        </div>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          definition.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {definition.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{definition.description}</p>
                  </div>
                ))}
              </div>
            </PanelCard>
          </aside>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <PanelCard
            title="Custom Tax Types"
            description="Configure reusable deductions. Permission `finance.tax.type.manage` controls customization."
          >
            {canManageTaxLibrary ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Tax Name"
                    value={taxForm.name}
                    onChange={(value) => setTaxForm((current) => ({ ...current, name: value }))}
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Tax Type</label>
                    <select
                      value={taxForm.type}
                      onChange={(event) =>
                        setTaxForm((current) => ({
                          ...current,
                          type: event.target.value as TaxDefinition["type"],
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <Field
                    label={taxForm.type === "percentage" ? "Tax Value (%)" : "Tax Value"}
                    value={taxForm.value}
                    onChange={(value) => setTaxForm((current) => ({ ...current, value }))}
                  />
                  <label className="flex items-end rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                    <span className="flex-1">Active</span>
                    <input
                      type="checkbox"
                      checked={taxForm.active}
                      onChange={(event) =>
                        setTaxForm((current) => ({ ...current, active: event.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                    <textarea
                      rows={4}
                      value={taxForm.description}
                      onChange={(event) =>
                        setTaxForm((current) => ({ ...current, description: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleCreateTaxDefinition}
                    className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Create Tax Type
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                Customization is restricted. Grant `finance.tax.type.manage` to create reusable tax types.
              </div>
            )}
          </PanelCard>

          <PanelCard
            title="Current Tax Catalogue"
            description="All deduction types available to payroll managers."
          >
            <div className="space-y-3">
              {taxDefinitions.map((definition) => (
                <div key={definition.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{definition.name}</div>
                      <div className="text-xs text-slate-500">
                        {taxModeLabel(definition.type)} ·{" "}
                        {definition.type === "percentage"
                          ? `${definition.value}%`
                          : formatCurrency(definition.value)}
                      </div>
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        definition.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {definition.active ? "Active" : "Inactive"}
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{definition.description}</p>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      )}

      <SalaryDetailsModal
        open={Boolean(detailsRecord)}
        record={detailsRecord}
        scope={scope}
        onClose={() => setDetailsRecord(null)}
      />
      <EditSalaryModal
        open={Boolean(editRecord)}
        record={editRecord}
        onClose={() => setEditRecord(null)}
        onSubmit={handleEditSalary}
      />
      <AddTaxModal
        open={Boolean(addTaxRecord)}
        record={addTaxRecord}
        taxDefinitions={taxDefinitions}
        canManageTaxTypes={canManageTaxLibrary}
        onClose={() => setAddTaxRecord(null)}
        onSubmit={handleApplyTax}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{icon}</div>
      </div>
      <div className="mt-5 text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function PanelCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
      />
    </div>
  );
}
