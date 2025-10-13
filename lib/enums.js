exports.SubscriptionStatus = { trialing: 'trialing', active: 'active', past_due: 'past_due', incomplete: 'incomplete', canceled: 'canceled' };
exports.DunningStatus = { failed: 'failed', reminded: 'reminded', recovered: 'recovered' };
exports.RetryAttemptStatus = { queued: 'queued', attempted: 'attempted', error: 'error' };
exports.DunningChannel = { email: 'email', slack: 'slack' };
exports.RecoverySource = { retry: 'retry', backfill: 'backfill', manual: 'manual' };
