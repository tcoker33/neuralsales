"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { startCall } from "@/app/actions/calls-start";
import { simulateCallStream } from "@/app/actions/calls-simulate";

const SEED_AGENT_ID = "00000000-0000-0000-0000-0000000000a1";
const SEED_LEAD_ID = "00000000-0000-0000-0000-0000000000b1";

export function RunSimulatedCall() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [agentId, setAgentId] = useState(SEED_AGENT_ID);
  const [leadId, setLeadId] = useState(SEED_LEAD_ID);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const created = await startCall({ leadId, agentId });
      if (!created.ok) {
        setError(`${created.error.code}: ${created.error.message}`);
        return;
      }

      const callId = created.data.id;
      const simulated = await simulateCallStream({ callId, agentId, leadId });
      if (!simulated.ok) {
        setError(`${simulated.error.code}: ${simulated.error.message}`);
        return;
      }

      router.push(`/dashboard/calls?callId=${callId}`);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-zinc-500">
            Lead ID
          </span>
          <input
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-zinc-600"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-zinc-500">
            Agent ID
          </span>
          <input
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-zinc-600"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:opacity-50"
      >
        {pending ? "Running…" : "Start + simulate call"}
      </button>
      <p className="text-xs text-zinc-500">
        Creates a call, persists the simulated stream, then opens the live view.
      </p>
    </div>
  );
}
