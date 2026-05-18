import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok, type Result } from "@/lib/result";

export type WorkspaceContext = {
  workspaceId: string;
  userId: string;
};

export async function resolveWorkspaceContext(): Promise<Result<WorkspaceContext>> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return fail("auth.error", "Failed to load authenticated user.", userError);
  }
  if (!user) {
    return fail("auth.unauthenticated", "No authenticated user.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return fail(
      "workspace.lookup_failed",
      "Failed to load workspace membership.",
      membershipError,
    );
  }
  if (!membership) {
    return fail(
      "workspace.no_membership",
      "User has no workspace membership.",
    );
  }

  return ok({ workspaceId: membership.workspace_id, userId: user.id });
}
