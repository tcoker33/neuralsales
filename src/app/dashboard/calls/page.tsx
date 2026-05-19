import { LiveCallStream } from "./live-call-stream";

type PageProps = {
  searchParams: Promise<{ callId?: string }>;
};

export default async function CallsPage({ searchParams }: PageProps) {
  const { callId } = await searchParams;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Calls</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Live verification surface for the simulated call stream.
        </p>
      </header>

      {callId ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl">
          <div className="mb-4 text-xs uppercase tracking-wider text-zinc-500">
            Call <span className="font-mono text-zinc-300">{callId}</span>
          </div>
          <LiveCallStream callId={callId} />
        </section>
      ) : (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center shadow-xl">
          <p className="text-zinc-300">No call selected.</p>
          <p className="mt-2 text-xs text-zinc-500">
            Append <span className="font-mono">?callId=&lt;uuid&gt;</span> to the URL.
          </p>
        </section>
      )}
    </main>
  );
}
