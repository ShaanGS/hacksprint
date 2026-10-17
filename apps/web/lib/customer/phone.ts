/**
 * An Indian mobile number as stored ("+919876543210"), or null if it isn't one. Accepts what
 * people type: spaces, dashes, a leading 0 or +91.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "").replace(/^(\+?91(?=\d{10}$)|0)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}
