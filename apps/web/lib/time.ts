// The shop's day runs on India time, wherever the server is.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Midnight at the start of today in India, as an instant. */
export function startOfShopDay(now = new Date()): Date {
  const india = new Date(now.getTime() + IST_OFFSET_MS);
  const midnight = Date.UTC(india.getUTCFullYear(), india.getUTCMonth(), india.getUTCDate());
  return new Date(midnight - IST_OFFSET_MS);
}
