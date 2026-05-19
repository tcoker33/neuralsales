import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok, type Result } from "@/lib/result";
import type { LeadRow } from "@/lib/leads/types";

export type AssignAgentInput = {
  workspaceId: string;
  leadId: string;
  agentId: string;
};

const LEAD_COLUMNS =
  "id, workspace_id, assigned_agent_id, status, first_name, last_name, email, phone, ai_summary, created_at, updated_at";

async function assignAgent(
  input: AssignAgentInput,
): Promise<Result<LeadRow>> {
  const supabase = await createSupabaseServerClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, workspace_id")
    .eq("id", input.leadId)
    .maybeSingle();

  if (leadError) {
    return fail("lead.lookup_failed", "Failed to load lead.", leadError);
  }
  if (!lead) {
    return fail("lead.not_found", "Lead does not exist.");
  }
  if (lead.workspace_id !== input.workspaceId) {
    return fail(
      "lead.workspace_mismatch",
      "Lead does not belong to this workspace.",
    );
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id, workspace_id")
    .eq("id", input.agentId)
    .maybeSingle();

  if (agentError) {
    return fail("agent.lookup_failed", "Failed to load agent.", agentError);
  }
  if (!agent) {
    return fail("agent.not_found", "Agent does not exist.");
  }
  if (agent.workspace_id !== input.workspaceId) {
    return fail(
      "agent.workspace_mismatch",
      "Agent does not belong to this workspace.",
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("leads")
    .update({
      assigned_agent_id: input.agentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.leadId)
    .eq("workspace_id", input.workspaceId)
    .select(LEAD_COLUMNS)
    .single();

  if (updateError) {
    return fail("lead.update_failed", "Failed to assign agent.", updateError);
  }
  if (!updated) {
    return fail("lead.update_failed", "Assignment update returned no row.");
  }

  return ok(updated as LeadRow);
}

export type ApplyCallOutcomeInput = {
  workspaceId: string;
  leadId: string;
  aiSummary: string;
  status: "contacted" | "qualified";
};

async function applyCallOutcome(
  input: ApplyCallOutcomeInput,
): Promise<Result<LeadRow>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("leads")
    .update({
      ai_summary: input.aiSummary,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.leadId)
    .eq("workspace_id", input.workspaceId)
    .select(LEAD_COLUMNS)
    .single();

  if (error) {
    return fail(
      "lead.update_failed",
      "Failed to apply call outcome to lead.",
      error,
    );
  }
  if (!data) {
    return fail(
      "lead.update_failed",
      "Lead outcome update returned no row.",
    );
  }
  return ok(data as LeadRow);
}

export const LeadRepository = {
  assignAgent,
  applyCallOutcome,
};
