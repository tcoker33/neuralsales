export type CallStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

export type CallSpeaker = "agent" | "lead";

export type CallSentiment = "positive" | "neutral" | "negative";
export type CallOutcome = "positive" | "neutral" | "negative";

export type CallRow = {
  id: string;
  workspace_id: string;
  lead_id: string;
  agent_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  summary: string | null;
  sentiment: string | null;
  outcome: string | null;
  external_crm_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CallEventRow = {
  id: string;
  workspace_id: string;
  call_id: string;
  kind: string;
  payload: Record<string, unknown>;
  sequence: number;
  created_at: string;
};

export type CallTranscriptRow = {
  id: string;
  workspace_id: string;
  call_id: string;
  speaker: string;
  content: string;
  sequence: number;
  created_at: string;
};
