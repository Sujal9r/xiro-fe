import type { PermissionKey } from "../../lib/permissions";

export type FinanceScope = "monthly" | "annual";
export type FinanceSection = "payroll" | "taxes";
export type PaymentStatus = "Paid" | "Pending" | "Processing";
export type TaxMode = "percentage" | "fixed";

export type TaxDefinition = {
  id: string;
  name: string;
  type: TaxMode;
  value: number;
  description: string;
  active: boolean;
};

export type AppliedTax = {
  id: string;
  definitionId?: string;
  name: string;
  type: TaxMode;
  value: number;
  description: string;
  active: boolean;
};

export type SalaryRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  basicSalary: number;
  bonus: number;
  allowances: number;
  paymentStatus: PaymentStatus;
  taxes: AppliedTax[];
};

export type CurrentFinanceUser = {
  id?: string;
  _id?: string;
  name?: string;
  employeeId?: string;
  permissions?: PermissionKey[];
};

export type HydratedSalaryRecord = SalaryRecord & {
  grossSalary: number;
  totalTax: number;
  netSalary: number;
  taxRows: Array<
    AppliedTax & {
      calculatedAmount: number;
    }
  >;
};

export type SalarySummary = {
  totalSalaryPayout: number;
  totalTaxDeducted: number;
  paidEmployees: number;
  pendingPayments: number;
};

export type TaxDraft = {
  mode: "existing" | "custom";
  target: "selected" | "all";
  definitionId: string;
  customName: string;
  customType: TaxMode;
  customValue: string;
  description: string;
  active: boolean;
};

export type SalaryEditDraft = {
  basicSalary: string;
  bonus: string;
  allowances: string;
  paymentStatus: PaymentStatus;
};
