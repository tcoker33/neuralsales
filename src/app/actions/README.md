# Server Actions Convention

NeuralSales server actions follow a single, boring contract.
"Cinematic on the surface, bulletproof underneath."

Every server action in `src/app/actions/*.ts` MUST:

1. **Validate input with zod.**
   Parse the raw input into a typed schema at the top of the action.
   Return a `Result` failure (`code: "input.invalid"`) on a parse error.
   Never trust client payload shape.

2. **Resolve workspace context.**
   Call `resolveWorkspaceContext()` from
   `@/lib/workspace/resolve-workspace-context`. If it fails, return the
   failure as-is. Actions never read the auth user directly.

3. **Call repositories, not Supabase, for domain writes.**
   Domain reads and writes live in `src/lib/<domain>/<domain>-repository.ts`
   (e.g. `LeadRepository.assignAgent`). Repositories own row-level
   verification (workspace ownership, foreign-key cross-checks).

4. **Return `Result<T>`.**
   Every action's return type is
   `Promise<Result<T>>` from `@/lib/result`. Use `ok(data)` for success
   and `fail(code, message, details?)` for expected failures. Throw only
   on truly unexpected programmer errors.

5. **Revalidate affected routes.**
   On a successful write, call `revalidatePath` (or `revalidateTag`)
   for every route that displays the mutated entity. Do this only when
   the result is `ok`.

6. **Never fabricate success.**
   If a downstream call fails, surface the failure. Do not swallow
   errors, do not return optimistic data, do not return `ok` with a
   stub. Audit trails depend on truthful results.

## Canonical shape

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { fail, ok, type Result } from "@/lib/result";
import { resolveWorkspaceContext } from "@/lib/workspace/resolve-workspace-context";
import { LeadRepository } from "@/lib/leads/lead-repository";
import type { LeadRow } from "@/lib/leads/types";

const InputSchema = z.object({
  leadId: z.string().uuid(),
  agentId: z.string().uuid(),
});

export async function someAction(
  raw: unknown,
): Promise<Result<LeadRow>> {
  const parsed = InputSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("input.invalid", "Invalid input.", parsed.error.flatten());
  }

  const ctx = await resolveWorkspaceContext();
  if (!ctx.ok) return ctx;

  const result = await LeadRepository.assignAgent({
    workspaceId: ctx.data.workspaceId,
    leadId: parsed.data.leadId,
    agentId: parsed.data.agentId,
  });
  if (!result.ok) return result;

  revalidatePath("/leads");
  return ok(result.data);
}
```

## Error codes

Use stable, dotted `code` strings (`lead.not_found`,
`lead.workspace_mismatch`, `agent.not_found`, `input.invalid`,
`auth.unauthenticated`). The UI maps codes to copy; never depend on
free-form messages for control flow.
