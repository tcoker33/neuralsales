"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type Result } from "@/lib/result";
import { LeadRepository } from "@/lib/leads/lead-repository";
import type { LeadRow } from "@/lib/leads/types";
import { resolveWorkspaceContext } from "@/lib/workspace/resolve-workspace-context";

const InputSchema = z.object({
  leadId: z.string().uuid(),
  agentId: z.string().uuid(),
});

export type AssignLeadAgentInput = z.infer<typeof InputSchema>;

export async function assignLeadAgent(
  input: AssignLeadAgentInput,
): Promise<Result<LeadRow>> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("input.invalid", "Invalid input.", parsed.error.flatten());
  }

  const ctx = await resolveWorkspaceContext();
  if (!ctx.ok) return ctx;

  const result = await LeadRepository.assignAgent({
    workspaceId: ctx.data.workspaceId,
    leadId: parsed.data.leadId,
    agentId: parsed.data.agentId,
  });
  if (!result.ok) return result;

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");

  return ok(result.data);
}
