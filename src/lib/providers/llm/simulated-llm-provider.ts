import type {
  CallOutcome,
  CallSentiment,
  CallTranscriptRow,
} from "@/lib/calls/types";
import { fail, ok, type Result } from "@/lib/result";

export type CallSummary = {
  summary: string;
  sentiment: CallSentiment;
  outcome: CallOutcome;
};

const POSITIVE_HINTS = [
  "interested",
  "demo",
  "walkthrough",
  "great",
  "yes",
  "sounds good",
  "looking forward",
];
const NEGATIVE_HINTS = [
  "not interested",
  "remove me",
  "stop",
  "unsubscribe",
  "do not call",
];

function classify(transcripts: CallTranscriptRow[]): CallOutcome {
  const haystack = transcripts
    .map((t) => t.content.toLowerCase())
    .join(" ");

  if (NEGATIVE_HINTS.some((h) => haystack.includes(h))) return "negative";
  if (POSITIVE_HINTS.some((h) => haystack.includes(h))) return "positive";
  return "neutral";
}

function compose(transcripts: CallTranscriptRow[], outcome: CallOutcome): string {
  const turns = transcripts.length;
  const leadLines = transcripts.filter((t) => t.speaker === "lead").length;
  const headline =
    outcome === "positive"
      ? "Lead engaged and asked for next steps."
      : outcome === "negative"
        ? "Lead declined and asked to be removed."
        : "Lead was lukewarm; follow up later.";
  return `${headline} ${turns} turns total, ${leadLines} from the lead.`;
}

export async function summarizeCall(
  transcripts: CallTranscriptRow[],
): Promise<Result<CallSummary>> {
  if (transcripts.length === 0) {
    return fail("llm.empty_transcript", "No transcript to summarize.");
  }
  const outcome = classify(transcripts);
  const summary = compose(transcripts, outcome);
  return ok({ summary, sentiment: outcome, outcome });
}
