import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "reply_to_ship",
  title: "Reply to a ship",
  description: "Post a threaded reply to an existing ShippedIn ship as the signed-in user.",
  inputSchema: {
    parent_ship_id: z.string().uuid().describe("The ID of the ship to reply to."),
    body: z.string().min(1).max(560).describe("Reply body (max 560 chars)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ parent_ship_id, body }, ctx) => {
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
    const { data, error } = await supabase
      .from("ships")
      .insert({ author_id: ctx.getUserId()!, body, parent_ship_id, post_type: "discussion" })
      .select("id, body, parent_ship_id, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Replied! id=${data.id}` }],
      structuredContent: { reply: data },
    };
  },
});