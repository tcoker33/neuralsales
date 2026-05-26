import type { ReactNode } from "react";
import Link from "next/link";

import { signOut } from "@/app/auth/actions";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveWorkspaceContext } from "@/lib/workspace/resolve-workspace-context";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const configured = isSupabaseConfigured();

  let userEmail: string | null = null;
  let workspaceId: string | null = null;
  let workspaceWarning: string | null = null;

  if (configured) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;

    const ctx = await resolveWorkspaceContext();
    if (ctx.ok) {
      workspaceId = ctx.data.workspaceId;
    } else {
      workspaceWarning = ctx.error.message;
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
              NeuralSales
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-400">
              <Link href="/dashboard" className="hover:text-zinc-100">
                Overview
              </Link>
              <Link href="/dashboard/calls" className="hover:text-zinc-100">
                Calls
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {configured ? (
              <>
                <span className="text-zinc-500">
                  {userEmail ?? "—"}
                  {workspaceId && (
                    <span className="ml-2 font-mono text-zinc-600">
                      ws:{workspaceId.slice(0, 8)}
                    </span>
                  )}
                </span>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-md border border-zinc-700 px-2 py-1 text-zinc-300 transition hover:border-zinc-500"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <span className="rounded-md border border-amber-900/60 bg-amber-950/30 px-2 py-1 text-amber-300">
                Demo mode — auth not configured
              </span>
            )}
          </div>
        </div>
      </header>

      {workspaceWarning && (
        <div className="mx-auto max-w-5xl px-6 pt-4">
          <p className="rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
            {workspaceWarning} Add a workspace_members row for your user to see data.
          </p>
        </div>
      )}

      {children}
    </div>
  );
}
