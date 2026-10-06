import type { SupabaseClient } from "@supabase/supabase-js";

// Stricter limits for posts made by agents/auto-posting (people posting by hand get looser limits in the database).
export const AGENT_MAX_POSTS_PER_DAY = 5;
export const AGENT_MAX_REPLIES_PER_THREAD = 3;

export async function checkAgentLimit(
  supabase: SupabaseClient,
  userId: string,
  parentShipId: string | null,
): Promise<string | null> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  let q = supabase
    .from("ships")
    .select("id", { count: "exact", head: true })
    .eq("author_id", userId)
    .gte("created_at", since);
  q = parentShipId ? q.eq("parent_ship_id", parentShipId) : q.is("parent_ship_id", null);
  const { count, error } = await q;
  if (error) return error.message;
  if (parentShipId && (count ?? 0) >= AGENT_MAX_REPLIES_PER_THREAD)
    return `Auto-post limit: max ${AGENT_MAX_REPLIES_PER_THREAD} replies per thread per day. Put extra details in one reply or the original post.`;
  if (!parentShipId && (count ?? 0) >= AGENT_MAX_POSTS_PER_DAY)
    return `Auto-post limit: max ${AGENT_MAX_POSTS_PER_DAY} posts per day. Combine updates into one bigger post tomorrow.`;
  return null;
}
