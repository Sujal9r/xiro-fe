import { AppliedTax, FinanceScope, HydratedSalaryRecord, SalaryRecord, SalarySummary, TaxDefinition, TaxMode } from "./types";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export const scopeLabel = (scope: FinanceScope) =>
  scope === "annual" ? "Annual Payroll" : "Monthly Payroll";

export const getScopeMultiplier = (scope: FinanceScope) => (scope === "annual" ? 12 : 1);

export const computeGrossSalary = (record: SalaryRecord) =>
  record.basicSalary + record.bonus + record.allowances;

export const calculateTaxAmount = (
  tax: Pick<AppliedTax | TaxDefinition, "type" | "value">,
  grossSalary: number,
) => (tax.type === "percentage" ? Math.round((grossSalary * tax.value) / 100) : tax.value);

export const hydrateSalaryRecord = (
  record: SalaryRecord,
  scope: FinanceScope,
): HydratedSalaryRecord => {
  const multiplier = getScopeMultiplier(scope);
  const monthlyGross = computeGrossSalary(record);
  const taxRows = record.taxes
    .filter((tax) => tax.active)
    .map((tax) => ({
      ...tax,
      calculatedAmount: calculateTaxAmount(tax, monthlyGross) * multiplier,
    }));
  const grossSalary = monthlyGross * multiplier;
  const totalTax = taxRows.reduce((sum, row) => sum + row.calculatedAmount, 0);

  return {
    ...record,
    basicSalary: record.basicSalary * multiplier,
    bonus: record.bonus * multiplier,
    allowances: record.allowances * multiplier,
    grossSalary,
    totalTax,
    netSalary: grossSalary - totalTax,
    taxRows,
  };
};

export const buildSalarySummary = (
  records: HydratedSalaryRecord[],
): SalarySummary => ({
  totalSalaryPayout: records.reduce((sum, record) => sum + record.netSalary, 0),
  totalTaxDeducted: records.reduce((sum, record) => sum + record.totalTax, 0),
  paidEmployees: records.filter((record) => record.paymentStatus === "Paid").length,
  pendingPayments: records.filter((record) => record.paymentStatus !== "Paid").length,
});

export const buildAppliedTax = (
  definition: TaxDefinition,
  overrides?: Partial<AppliedTax>,
): AppliedTax => ({
  id: overrides?.id || `${definition.id}-${Date.now()}`,
  definitionId: definition.id,
  name: overrides?.name || definition.name,
  type: overrides?.type || definition.type,
  value: overrides?.value ?? definition.value,
  description: overrides?.description || definition.description,
  active: overrides?.active ?? definition.active,
});

export const paymentStatusTone = (status: SalaryRecord["paymentStatus"]) => {
  if (status === "Paid") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "Processing") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
};

export const taxModeLabel = (mode: TaxMode) =>
  mode === "percentage" ? "Percentage" : "Fixed amount";
