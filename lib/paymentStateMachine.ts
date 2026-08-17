export type PaymentState =
  | "PENDING"
  | "ORDER_CREATED"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "EXPIRED"
  | "REFUND_PENDING"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "REFUND_FAILED"
  | "CANCELLED";

const VALID_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  PENDING: ["ORDER_CREATED", "AUTHORIZED", "CAPTURED", "FAILED", "CANCELLED"],
  ORDER_CREATED: ["AUTHORIZED", "CAPTURED", "FAILED", "EXPIRED", "CANCELLED"],
  AUTHORIZED: ["CAPTURED", "FAILED", "CANCELLED"],
  CAPTURED: ["REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED"],
  FAILED: [],
  EXPIRED: [],
  REFUND_PENDING: ["REFUNDED", "PARTIALLY_REFUNDED", "REFUND_FAILED"],
  PARTIALLY_REFUNDED: ["REFUND_PENDING", "REFUNDED"],
  REFUNDED: [],
  REFUND_FAILED: ["REFUND_PENDING", "REFUNDED"],
  CANCELLED: [],
};

export function canTransitionPayment(currentState: string, nextState: PaymentState): boolean {
  const current = currentState as PaymentState;
  if (current === nextState) return true; // Idempotent same-state call
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(nextState);
}

export function validatePaymentTransition(currentState: string, nextState: PaymentState): void {
  if (!canTransitionPayment(currentState, nextState)) {
    throw new Error(`Invalid payment state transition from ${currentState} to ${nextState}`);
  }
}
