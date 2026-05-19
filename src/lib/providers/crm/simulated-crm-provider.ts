import { ok, type Result } from "@/lib/result";

export type CrmLogCallInput = {
  workspaceId: string;
  callId: string;
  leadId: string;
  agentId: string;
  summary: string;
  outcome: string;
};

export type CrmLogCallReceipt = {
  externalId: string;
  loggedAt: string;
};

/**
 * Placeholder for a real CRM "log call" sync. Returns a deterministic
 * receipt so downstream code can store the external id without a live
 * integration.
 */
export async function logCall(
  input: CrmLogCallInput,
): Promise<Result<CrmLogCallReceipt>> {
  const externalId = `sim_${input.callId}`;
  return ok({ externalId, loggedAt: new Date().toISOString() });
}
