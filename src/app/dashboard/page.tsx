import { RunSimulatedCall } from "./run-simulated-call";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default function DashboardPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Verify the persisted call chain: start &rarr; simulate &rarr; stream.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl">
        <h2 className="mb-4 text-sm font-medium text-zinc-200">
          Run a simulated call
        </h2>
        {configured ? (
          <RunSimulatedCall />
        ) : (
          <p className="text-sm text-zinc-400">
            Persistence is disabled in demo mode. Open{" "}
            <span className="font-mono">/dashboard/calls?callId=&lt;uuid&gt;</span>{" "}
            to watch the simulated stream directly.
          </p>
        )}
      </section>
    </main>
  );
}
