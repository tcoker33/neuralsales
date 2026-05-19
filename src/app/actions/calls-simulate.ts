"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type Result } from "@/lib/result";
import { CallRepository } from "@/lib/calls/call-repository";
import type { CallRow } from "@/lib/calls/types";
import { LeadRepository } from "@/lib/leads/lead-repository";
import { logCall as crmLogCall } from "@/lib/providers/crm/simulated-crm-provider";
import { summarizeCall } from "@/lib/providers/llm/simulated-llm-provider";
import {
  streamCall,
  type VoiceEvent,
} from "@/lib/providers/voice/simulated-voice-provider";
import { resolveWorkspaceContext } from "@/lib/workspace/resolve-workspace-context";

const InputSchema = z.object({
  callId: z.string().uuid(),
  agentId: z.string().uuid(),
  leadId: z.string().uuid(),
});

export type SimulateCallStreamInput = z.infer<typeof InputSchema>;

export type SimulateCallStreamResult = {
  call: CallRow;
  eventsAppended: number;
  transcriptsAppended: number;
};

export async function simulateCallStream(
  input: SimulateCallStreamInput,
): Promise<Result<SimulateCallStreamResult>> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("input.invalid", "Invalid input.", parsed.error.flatten());
  }

  const ctx = await resolveWorkspaceContext();
  if (!ctx.ok) return ctx;
  const { workspaceId } = ctx.data;

  const callLookup = await CallRepository.getCall({
    workspaceId,
    callId: parsed.data.callId,
  });
  if (!callLookup.ok) return callLookup;

  const callRow = callLookup.data;
  if (callRow.lead_id !== parsed.data.leadId) {
    return fail(
      "call.lead_mismatch",
      "Lead does not match the call's lead.",
    );
  }
  if (callRow.agent_id !== parsed.data.agentId) {
    return fail(
      "call.agent_mismatch",
      "Agent does not match the call's agent.",
    );
  }

  let eventSeq = 0;
  let transcriptSeq = 0;
  let eventsAppended = 0;
  let transcriptsAppended = 0;
  let latest: CallRow = callRow;

  for await (const event of streamCall({ callId: parsed.data.callId })) {
    const eventResult = await CallRepository.appendEvent({
      workspaceId,
      callId: parsed.data.callId,
      kind: event.kind,
      payload: toPayload(event),
      sequence: eventSeq++,
    });
    if (!eventResult.ok) return eventResult;
    eventsAppended++;

    if (event.kind === "transcript_delta") {
      const transcriptResult = await CallRepository.appendTranscript({
        workspaceId,
        callId: parsed.data.callId,
        speaker: event.speaker,
        content: event.content,
        sequence: transcriptSeq++,
      });
      if (!transcriptResult.ok) return transcriptResult;
      transcriptsAppended++;
    }

    const projectionPatch = projectionPatchFor(event);
    if (projectionPatch) {
      const updated = await CallRepository.updateProjection({
        workspaceId,
        callId: parsed.data.callId,
        patch: projectionPatch,
      });
      if (!updated.ok) return updated;
      latest = updated.data;
    }
  }

  const transcripts = await CallRepository.listTranscripts({
    workspaceId,
    callId: parsed.data.callId,
  });
  if (!transcripts.ok) return transcripts;

  const summary = await summarizeCall(transcripts.data);
  if (!summary.ok) return summary;

  const crm = await crmLogCall({
    workspaceId,
    callId: parsed.data.callId,
    leadId: parsed.data.leadId,
    agentId: parsed.data.agentId,
    summary: summary.data.summary,
    outcome: summary.data.outcome,
  });
  if (!crm.ok) return crm;

  const finalProjection = await CallRepository.updateProjection({
    workspaceId,
    callId: parsed.data.callId,
    patch: {
      status: "completed",
      summary: summary.data.summary,
      sentiment: summary.data.sentiment,
      outcome: summary.data.outcome,
      external_crm_id: crm.data.externalId,
    },
  });
  if (!finalProjection.ok) return finalProjection;
  latest = finalProjection.data;

  const nextLeadStatus =
    summary.data.outcome === "positive" ? "qualified" : "contacted";
  const leadUpdate = await LeadRepository.applyCallOutcome({
    workspaceId,
    leadId: parsed.data.leadId,
    aiSummary: summary.data.summary,
    status: nextLeadStatus,
  });
  if (!leadUpdate.ok) return leadUpdate;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/calls/${parsed.data.callId}`);

  return ok({
    call: latest,
    eventsAppended,
    transcriptsAppended,
  });
}

function toPayload(event: VoiceEvent): Record<string, unknown> {
  // Strip the `kind` discriminator from the JSONB payload — it's already
  // stored in the column.
  const { kind: _kind, ...rest } = event;
  return rest as Record<string, unknown>;
}

function projectionPatchFor(event: VoiceEvent) {
  switch (event.kind) {
    case "call_started":
      return { status: "in_progress", started_at: event.at };
    case "status_changed":
      return { status: event.status };
    case "call_ended":
      return { ended_at: event.at };
    case "transcript_delta":
      return null;
  }
}
