"use client";

import Modal from "../Modal";
import PayslipCard from "./PayslipCard";
import SalaryBreakdownCard from "./SalaryBreakdownCard";
import TaxBreakdownCard from "./TaxBreakdownCard";
import { FinanceScope, HydratedSalaryRecord } from "./types";

type SalaryDetailsModalProps = {
  open: boolean;
  record: HydratedSalaryRecord | null;
  scope: FinanceScope;
  onClose: () => void;
};

export default function SalaryDetailsModal({
  open,
  record,
  scope,
  onClose,
}: SalaryDetailsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={record ? `${record.employeeName} Payroll Breakdown` : "Payroll Breakdown"}
      description="Review gross salary, deductions, and the employee-facing payslip preview."
    >
      {record ? (
        <div className="space-y-6">
          <PayslipCard record={record} scope={scope} />
          <div className="grid gap-6 lg:grid-cols-2">
            <SalaryBreakdownCard record={record} />
            <TaxBreakdownCard record={record} />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
