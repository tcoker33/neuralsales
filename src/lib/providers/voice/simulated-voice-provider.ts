import type { CallSpeaker } from "@/lib/calls/types";

export type VoiceEvent =
  | { kind: "call_started"; at: string }
  | { kind: "status_changed"; status: "in_progress"; at: string }
  | {
      kind: "transcript_delta";
      speaker: CallSpeaker;
      content: string;
      at: string;
    }
  | { kind: "call_ended"; at: string };

type Script = {
  outcome: "positive" | "neutral" | "negative";
  lines: Array<{ speaker: CallSpeaker; content: string }>;
};

const SCRIPTS: Script[] = [
  {
    outcome: "positive",
    lines: [
      { speaker: "agent", content: "Hi, this is Alex from NeuralSales — got a minute?" },
      { speaker: "lead", content: "Sure, what's this about?" },
      { speaker: "agent", content: "We help teams cut their qualification time in half. Worth a quick look?" },
      { speaker: "lead", content: "Yeah actually, that sounds interesting. Can you send over a demo?" },
      { speaker: "agent", content: "Absolutely — I'll book a 20-minute walkthrough this week." },
      { speaker: "lead", content: "Great, looking forward to it." },
    ],
  },
  {
    outcome: "neutral",
    lines: [
      { speaker: "agent", content: "Hi, this is Alex from NeuralSales — quick call?" },
      { speaker: "lead", content: "I'm in a meeting, what is it?" },
      { speaker: "agent", content: "Just wanted to see if better call qualification is on your roadmap." },
      { speaker: "lead", content: "Maybe later in the quarter. Send me an email." },
      { speaker: "agent", content: "Will do — talk soon." },
    ],
  },
  {
    outcome: "negative",
    lines: [
      { speaker: "agent", content: "Hi, this is Alex from NeuralSales —" },
      { speaker: "lead", content: "Not interested, please remove me from your list." },
      { speaker: "agent", content: "Understood — apologies for the interruption." },
    ],
  },
];

function pickScript(callId: string): Script {
  let sum = 0;
  for (const ch of callId) sum = (sum + ch.charCodeAt(0)) >>> 0;
  return SCRIPTS[sum % SCRIPTS.length]!;
}

export type SimulatedVoiceStreamInput = {
  callId: string;
  /** Optional delay between yielded events, defaults to 0 (synchronous). */
  delayMs?: number;
};

export async function* streamCall(
  input: SimulatedVoiceStreamInput,
): AsyncGenerator<VoiceEvent, void, void> {
  const script = pickScript(input.callId);
  const delay = input.delayMs ?? 0;

  const sleep = () =>
    delay > 0 ? new Promise<void>((r) => setTimeout(r, delay)) : Promise.resolve();

  yield { kind: "call_started", at: new Date().toISOString() };
  await sleep();

  yield {
    kind: "status_changed",
    status: "in_progress",
    at: new Date().toISOString(),
  };
  await sleep();

  for (const line of script.lines) {
    yield {
      kind: "transcript_delta",
      speaker: line.speaker,
      content: line.content,
      at: new Date().toISOString(),
    };
    await sleep();
  }

  yield { kind: "call_ended", at: new Date().toISOString() };
}

/** Exposed for the LLM provider so the simulator stays deterministic. */
export function expectedOutcomeForCall(callId: string): Script["outcome"] {
  return pickScript(callId).outcome;
}
