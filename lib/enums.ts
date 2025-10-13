export const SubscriptionStatus = {
  trialing: 'trialing',
  active: 'active',
  past_due: 'past_due',
  incomplete: 'incomplete',
  canceled: 'canceled',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const DunningStatus = {
  failed: 'failed',
  reminded: 'reminded',
  recovered: 'recovered',
} as const;
export type DunningStatus = (typeof DunningStatus)[keyof typeof DunningStatus];

export const RetryAttemptStatus = {
  queued: 'queued',
  attempted: 'attempted',
  error: 'error',
} as const;
export type RetryAttemptStatus = (typeof RetryAttemptStatus)[keyof typeof RetryAttemptStatus];

export const DunningChannel = {
  email: 'email',
  slack: 'slack',
} as const;
export type DunningChannel = (typeof DunningChannel)[keyof typeof DunningChannel];

export const RecoverySource = {
  retry: 'retry',
  backfill: 'backfill',
  manual: 'manual',
} as const;
export type RecoverySource = (typeof RecoverySource)[keyof typeof RecoverySource];
