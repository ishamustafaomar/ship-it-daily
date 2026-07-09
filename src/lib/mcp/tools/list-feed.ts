import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_feed",
  title: "List ShippedIn feed",
  description: "List the most recent top-level ships from ShippedIn. Use scope 'following' to only include people the signed-in user follows, or 'for_you' for the global recent feed.",
  inputSchema: {
    scope: z.enum(["following", "for_you"]).default("for_you").describe("Which feed to read."),
    limit: z.number().int().min(1).max(50).default(20).describe("Max number of ships to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ scope, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );

    let authorIds: string[] | null = null;
    if (scope === "following") {
      const { data: follows, error: fErr } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", ctx.getUserId()!);
      if (fErr) return { content: [{ type: "text", text: fErr.message }], isError: true };
      authorIds = [ctx.getUserId()!, ...(follows ?? []).map((f: any) => f.following_id)];
    }

    let q = supabase
      .from("ships")
      .select("id, author_id, body, tool_tag, link_url, post_type, created_at")
      .is("parent_ship_id", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (authorIds) q = q.in("author_id", authorIds);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { ships: data },
    };
  },
});