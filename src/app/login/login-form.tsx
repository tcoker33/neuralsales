"use client";

import { useActionState } from "react";

import { signIn, signUp, type AuthFormState } from "@/app/auth/actions";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [signInState, signInAction, signInPending] = useActionState<
    AuthFormState,
    FormData
  >(signIn, null);
  const [signUpState, signUpAction, signUpPending] = useActionState<
    AuthFormState,
    FormData
  >(signUp, null);

  const error = signInState?.error ?? signUpState?.error ?? null;
  const pending = signInPending || signUpPending;

  return (
    <form className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="space-y-1">
        <label htmlFor="email" className="text-xs uppercase tracking-wider text-zinc-500">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-xs uppercase tracking-wider text-zinc-500">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          formAction={signInAction}
          disabled={pending}
          className="flex-1 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:opacity-50"
        >
          {signInPending ? "Signing in…" : "Sign in"}
        </button>
        <button
          type="submit"
          formAction={signUpAction}
          disabled={pending}
          className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 disabled:opacity-50"
        >
          {signUpPending ? "Creating…" : "Sign up"}
        </button>
      </div>
    </form>
  );
}
