// The amounts the owner can tap for the bill-pay agent's mandate (decision of Oct 18). Only these
// can be saved, so the owner never types an amount and a stray value can never become his limit.

/** ₹10,000, ₹25,000 or ₹50,000 the agent may pay in any 7 days. */
export const WEEKLY_LIMITS_PAISE = [1_000_000, 2_500_000, 5_000_000] as const;

/** ₹1,000, ₹2,000 or ₹5,000 that always stays in hand. */
export const KEEP_IN_HAND_PAISE = [100_000, 200_000, 500_000] as const;

/** The weekly limit counts the agent's own payments over this many days. */
export const LIMIT_DAYS = 7;
