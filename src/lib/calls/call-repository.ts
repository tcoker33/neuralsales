import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok, type Result } from "@/lib/result";
import type {
  CallEventRow,
  CallRow,
  CallTranscriptRow,
} from "@/lib/calls/types";

const CALL_COLUMNS =
  "id, workspace_id, lead_id, agent_id, status, started_at, ended_at, summary, sentiment, outcome, external_crm_id, created_at, updated_at";

const EVENT_COLUMNS =
  "id, workspace_id, call_id, kind, payload, sequence, created_at";

const TRANSCRIPT_COLUMNS =
  "id, workspace_id, call_id, speaker, content, sequence, created_at";

async function getCall(input: {
  workspaceId: string;
  callId: string;
}): Promise<Result<CallRow>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("calls")
    .select(CALL_COLUMNS)
    .eq("id", input.callId)
    .maybeSingle();

  if (error) return fail("call.lookup_failed", "Failed to load call.", error);
  if (!data) return fail("call.not_found", "Call does not exist.");
  if (data.workspace_id !== input.workspaceId) {
    return fail(
      "call.workspace_mismatch",
      "Call does not belong to this workspace.",
    );
  }
  return ok(data as CallRow);
}

async function appendEvent(input: {
  workspaceId: string;
  callId: string;
  kind: string;
  payload: Record<string, unknown>;
  sequence: number;
}): Promise<Result<CallEventRow>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("call_events")
    .insert({
      workspace_id: input.workspaceId,
      call_id: input.callId,
      kind: input.kind,
      payload: input.payload,
      sequence: input.sequence,
    })
    .select(EVENT_COLUMNS)
    .single();

  if (error) {
    return fail("call_event.insert_failed", "Failed to append event.", error);
  }
  return ok(data as CallEventRow);
}

async function appendTranscript(input: {
  workspaceId: string;
  callId: string;
  speaker: string;
  content: string;
  sequence: number;
}): Promise<Result<CallTranscriptRow>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("call_transcripts")
    .insert({
      workspace_id: input.workspaceId,
      call_id: input.callId,
      speaker: input.speaker,
      content: input.content,
      sequence: input.sequence,
    })
    .select(TRANSCRIPT_COLUMNS)
    .single();

  if (error) {
    return fail(
      "call_transcript.insert_failed",
      "Failed to append transcript delta.",
      error,
    );
  }
  return ok(data as CallTranscriptRow);
}

async function updateProjection(input: {
  workspaceId: string;
  callId: string;
  patch: Partial<
    Pick<
      CallRow,
      | "status"
      | "started_at"
      | "ended_at"
      | "summary"
      | "sentiment"
      | "outcome"
      | "external_crm_id"
    >
  >;
}): Promise<Result<CallRow>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("calls")
    .update({
      ...input.patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.callId)
    .eq("workspace_id", input.workspaceId)
    .select(CALL_COLUMNS)
    .single();

  if (error) {
    return fail("call.update_failed", "Failed to update call.", error);
  }
  if (!data) {
    return fail("call.update_failed", "Call update returned no row.");
  }
  return ok(data as CallRow);
}

async function listTranscripts(input: {
  workspaceId: string;
  callId: string;
}): Promise<Result<CallTranscriptRow[]>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("call_transcripts")
    .select(TRANSCRIPT_COLUMNS)
    .eq("workspace_id", input.workspaceId)
    .eq("call_id", input.callId)
    .order("sequence", { ascending: true });

  if (error) {
    return fail(
      "call_transcript.list_failed",
      "Failed to list transcripts.",
      error,
    );
  }
  return ok((data ?? []) as CallTranscriptRow[]);
}

export const CallRepository = {
  getCall,
  appendEvent,
  appendTranscript,
  updateProjection,
  listTranscripts,
};
