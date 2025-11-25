export const TASK_GUARD_KEY_FALLBACK: Record<string, string> = {
  CONFIRM_CAR: "tasks.confirmCar.completed",
  PREPARE_QUOTE: "quotationPrepared",
  VERIFY_VEHICLE: "vehicle.verified",
  COLLECT_DOCS: "docs.required.allUploaded",
  COLLECT_BUYER_DOCS: "docs.required.allUploaded",
  COLLECT_BUYER_DOCS_COMPANY: "docs.required.allUploaded",
  COLLECT_BUYER_DOCS_INDIVIDUAL: "docs.required.allUploaded",
  COLLECT_SELLER_DOCS: "docs.seller.allUploaded",
  COLLECT_SELLER_DOCS_COMPANY: "docs.seller.allUploaded",
  COLLECT_SELLER_DOCS_INDIVIDUAL: "docs.seller.allUploaded",
  AECB_CHECK: "risk.approved",
  FIN_CALC: "finance.approved",
  INVESTOR_APPROVAL: "investor.approved",
  PREPARE_CONTRACT: "legal.contractReady",
  RECEIVE_ADVANCE: "payments.advanceReceived",
  PAY_SUPPLIER: "payments.supplierPaid",
  ARRANGE_DELIVERY: "delivery.confirmed",
};

type TaskLike = {
  type?: string | null;
  payload?: Record<string, unknown> | null;
};

export function resolveTaskGuardKey(task: TaskLike): string | null {
  const payloadGuard =
    task.payload && typeof task.payload.guard_key === "string"
      ? (task.payload.guard_key as string)
      : null;
  if (payloadGuard) {
    return payloadGuard;
  }

  const type = task.type;
  if (!type) {
    return null;
  }

  return TASK_GUARD_KEY_FALLBACK[type] ?? null;
}
