import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ redirectTo?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { redirectTo } = await searchParams;
  const safeRedirect =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/dashboard";

  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <h1 className="text-xl font-semibold">Auth not configured</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Set <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
          <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to enable
          sign-in. The simulated demo works without it.
        </p>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(safeRedirect);
  }

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">NeuralSales</h1>
        <p className="mt-1 text-sm text-zinc-400">Sign in to your workspace.</p>
      </header>
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl">
        <LoginForm redirectTo={safeRedirect} />
      </section>
    </main>
  );
}
