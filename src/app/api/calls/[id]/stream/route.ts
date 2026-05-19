import { z } from "zod";

import { CallRepository } from "@/lib/calls/call-repository";
import { streamCall as simulatedStreamCall } from "@/lib/providers/voice/simulated-voice-provider";
import { resolveWorkspaceContext } from "@/lib/workspace/resolve-workspace-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ParamsSchema = z.object({ id: z.string().uuid() });

const POLL_INTERVAL_MS = 500;
const HEARTBEAT_INTERVAL_MS = 5_000;
const TERMINAL_STATUSES = new Set(["completed", "failed"]);

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const parsed = ParamsSchema.safeParse({ id });
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "input.invalid",
          message: "Invalid call id.",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }
  const callId = parsed.data.id;

  if (!isSupabaseConfigured()) {
    return openSimulatedSseResponse(callId, request.signal);
  }

  const workspace = await resolveWorkspaceContext();
  if (!workspace.ok) {
    const status = workspace.error.code === "auth.unauthenticated" ? 401 : 400;
    return Response.json({ ok: false, error: workspace.error }, { status });
  }

  const call = await CallRepository.getCall({
    workspaceId: workspace.data.workspaceId,
    callId,
  });
  if (!call.ok) {
    const status =
      call.error.code === "call.not_found"
        ? 404
        : call.error.code === "call.workspace_mismatch"
          ? 403
          : 500;
    return Response.json({ ok: false, error: call.error }, { status });
  }

  return openPersistedSseResponse({
    workspaceId: workspace.data.workspaceId,
    callId,
    signal: request.signal,
  });
}

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function openPersistedSseResponse(input: {
  workspaceId: string;
  callId: string;
  signal: AbortSignal;
}): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
          return true;
        } catch {
          return false;
        }
      };

      let lastSequence = -1;
      let lastHeartbeatAt = 0;

      try {
        while (!input.signal.aborted) {
          const events = await CallRepository.listEventsAfter({
            workspaceId: input.workspaceId,
            callId: input.callId,
            afterSequence: lastSequence,
          });
          if (!events.ok) {
            enqueue(
              `event: error\ndata: ${JSON.stringify({ ok: false, error: events.error })}\n\n`,
            );
            break;
          }

          for (const event of events.data) {
            const payload = {
              sequence: event.sequence,
              kind: event.kind,
              payload: event.payload,
              createdAt: event.created_at,
            };
            if (!enqueue(`data: ${JSON.stringify(payload)}\n\n`)) return;
            lastSequence = event.sequence;
          }

          const now = Date.now();
          if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
            if (!enqueue(`: heartbeat\n\n`)) return;
            lastHeartbeatAt = now;
          }

          if (events.data.length === 0) {
            const call = await CallRepository.getCall({
              workspaceId: input.workspaceId,
              callId: input.callId,
            });
            if (call.ok && TERMINAL_STATUSES.has(call.data.status)) {
              enqueue(
                `event: end\ndata: ${JSON.stringify({ reason: "call_terminal", status: call.data.status })}\n\n`,
              );
              break;
            }
          }

          await sleep(POLL_INTERVAL_MS, input.signal);
        }
      } finally {
        try {
          controller.close();
        } catch {
          // already closed by client abort
        }
      }
    },
    cancel() {
      // The abort signal listener inside `sleep` and the `signal.aborted`
      // check at the loop head handle teardown.
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

function openSimulatedSseResponse(
  callId: string,
  signal: AbortSignal,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
          return true;
        } catch {
          return false;
        }
      };

      let sequence = 0;
      try {
        for await (const event of simulatedStreamCall({
          callId,
          delayMs: POLL_INTERVAL_MS,
        })) {
          if (signal.aborted) return;
          const { kind: _kind, ...rest } = event;
          const payload = {
            sequence,
            kind: event.kind,
            payload: rest,
            source: "simulated" as const,
          };
          if (!enqueue(`data: ${JSON.stringify(payload)}\n\n`)) return;
          sequence++;

          if (!enqueue(`: heartbeat\n\n`)) return;
        }
        enqueue(
          `event: end\ndata: ${JSON.stringify({ reason: "simulated_complete", source: "simulated" })}\n\n`,
        );
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}
