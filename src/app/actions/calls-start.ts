"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type Result } from "@/lib/result";
import { CallRepository } from "@/lib/calls/call-repository";
import type { CallRow } from "@/lib/calls/types";
import { resolveWorkspaceContext } from "@/lib/workspace/resolve-workspace-context";

const InputSchema = z.object({
  leadId: z.string().uuid(),
  agentId: z.string().uuid(),
});

export type StartCallInput = z.infer<typeof InputSchema>;

export async function startCall(
  input: StartCallInput,
): Promise<Result<CallRow>> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("input.invalid", "Invalid input.", parsed.error.flatten());
  }

  const ctx = await resolveWorkspaceContext();
  if (!ctx.ok) return ctx;

  const result = await CallRepository.createCall({
    workspaceId: ctx.data.workspaceId,
    leadId: parsed.data.leadId,
    agentId: parsed.data.agentId,
  });
  if (!result.ok) return result;

  revalidatePath("/dashboard/calls");
  return ok(result.data);
}
