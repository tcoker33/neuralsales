"use client";

import { useEffect, useState } from "react";

type ConnState = "connecting" | "open" | "closed" | "error";

type StreamEvent = {
  sequence: number;
  kind: string;
  payload: Record<string, unknown>;
  createdAt?: string;
  source?: string;
};

type TranscriptLine = {
  sequence: number;
  speaker: string;
  content: string;
};

type EndInfo = {
  reason?: string;
  status?: string;
  source?: string;
};

export function LiveCallStream({ callId }: { callId: string }) {
  const [state, setState] = useState<ConnState>("connecting");
  const [eventCount, setEventCount] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [endInfo, setEndInfo] = useState<EndInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setState("connecting");
    setEventCount(0);
    setTranscripts([]);
    setEndInfo(null);
    setErrorMessage(null);

    const es = new EventSource(`/api/calls/${callId}/stream`);

    es.onopen = () => setState("open");

    es.onmessage = (ev) => {
      setEventCount((c) => c + 1);
      try {
        const data = JSON.parse(ev.data) as StreamEvent;
        if (data.kind === "transcript_delta") {
          const payload = data.payload as {
            speaker?: string;
            content?: string;
          };
          if (payload.speaker && payload.content) {
            setTranscripts((rows) => [
              ...rows,
              {
                sequence: data.sequence,
                speaker: payload.speaker as string,
                content: payload.content as string,
              },
            ]);
          }
        }
      } catch {
        // ignore malformed frame
      }
    };

    const onEnd = (ev: MessageEvent) => {
      try {
        setEndInfo(JSON.parse(ev.data) as EndInfo);
      } catch {
        setEndInfo({});
      }
      setState("closed");
      es.close();
    };

    const onNamedError = (ev: MessageEvent) => {
      if (ev.data) {
        setErrorMessage(typeof ev.data === "string" ? ev.data : JSON.stringify(ev.data));
        setState("error");
        es.close();
      } else if (es.readyState === EventSource.CLOSED) {
        setState((s) => (s === "closed" ? s : "error"));
      }
    };

    es.addEventListener("end", onEnd as EventListener);
    es.addEventListener("error", onNamedError as EventListener);

    return () => {
      es.close();
    };
  }, [callId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className={dotClass(state)} aria-hidden />
          <span className="text-zinc-400">connection</span>
          <span className="font-mono text-zinc-100">{state}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">events</span>
          <span className="font-mono text-zinc-100">{eventCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">transcript lines</span>
          <span className="font-mono text-zinc-100">{transcripts.length}</span>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <h2 className="mb-3 text-xs uppercase tracking-wider text-zinc-500">
          Transcript
        </h2>
        {transcripts.length === 0 ? (
          <p className="text-sm text-zinc-500">No transcript yet.</p>
        ) : (
          <ol className="space-y-2">
            {transcripts.map((line) => (
              <li
                key={line.sequence}
                className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
              >
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {line.speaker}
                </div>
                <div className="text-sm text-zinc-100">{line.content}</div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {endInfo && (
        <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">
          <div className="text-xs uppercase tracking-wider text-emerald-400/80">
            Stream ended
          </div>
          <pre className="mt-1 whitespace-pre-wrap font-mono text-xs">
            {JSON.stringify(endInfo, null, 2)}
          </pre>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
          <div className="text-xs uppercase tracking-wider text-red-400/80">
            Stream error
          </div>
          <pre className="mt-1 whitespace-pre-wrap font-mono text-xs">
            {errorMessage}
          </pre>
        </div>
      )}
    </div>
  );
}

function dotClass(state: ConnState): string {
  const base = "inline-block h-2 w-2 rounded-full";
  switch (state) {
    case "open":
      return `${base} bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]`;
    case "connecting":
      return `${base} bg-amber-400 animate-pulse`;
    case "closed":
      return `${base} bg-zinc-500`;
    case "error":
      return `${base} bg-red-500`;
  }
}
