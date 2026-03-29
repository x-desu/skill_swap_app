import type { Timestamp } from './user';

export type CreditLedgerReason =
  | 'subscription_initial_credit_grant'
  | 'subscription_renewal_credit_grant'
  | 'credit_pack_purchase'
  | 'credit_spend'
  | 'refund_reversal'
  | 'admin_adjustment'
  | 'initial_signup_grant';

export interface CreditLedgerEntry {
  id: string;
  userId: string;
  delta: number;
  balanceAfter: number;
  reason: CreditLedgerReason | string;
  referenceType: string;
  referenceId: string;
  productId?: string;
  createdAt: Timestamp;
  createdBy?: string;
}
