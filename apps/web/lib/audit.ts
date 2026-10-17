import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditEntry = {
  actor: "agent" | "owner" | "customer" | "system" | "paytm" | "n8n";
  action: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
};

/**
 * Writes what happened to audit_log in one insert (guardrail 6). A failed audit write is an
 * error, not a warning: an action nobody can trace should not look like it succeeded.
 */
export async function audit(
  db: SupabaseClient,
  shopId: string,
  entries: AuditEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  const { error } = await db.from("audit_log").insert(
    entries.map((entry) => ({
      shop_id: shopId,
      actor: entry.actor,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      payload: entry.payload ?? {},
    })),
  );
  if (error) throw new Error(`Could not write the audit log: ${error.message}`);
}
