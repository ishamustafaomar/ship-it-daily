import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const httpUrl = z
  .string()
  .url()
  .refine((v) => {
    try {
      const p = new URL(v).protocol;
      return p === "http:" || p === "https:";
    } catch {
      return false;
    }
  }, { message: "Only http(s) URLs are allowed" });

export default defineTool({
  name: "create_ship",
  title: "Create a ship",
  description: "Post something to ShippedIn as the signed-in user. Use post_type 'ship' for what you shipped today, 'ask' to ask for help, 'feedback' to request feedback, or 'discussion' for general talk. Keeps the daily streak going.",
  inputSchema: {
    body: z.string().min(1).max(560).describe("The post body (max 560 chars)."),
    post_type: z.enum(["ship", "ask", "feedback", "discussion"]).default("ship"),
    tool_tag: z.string().max(24).nullish().describe("Optional AI tool tag (e.g. 'Lovable', 'Cursor')."),
    link_url: httpUrl.nullish().describe("Optional http(s) URL to link to."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ body, post_type, tool_tag, link_url }, ctx) => {
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
      .insert({
        author_id: ctx.getUserId()!,
        body,
        post_type,
        tool_tag: tool_tag ?? null,
        link_url: link_url ?? null,
      })
      .select("id, body, post_type, tool_tag, link_url, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Shipped! id=${data.id}` }],
      structuredContent: { ship: data },
    };
  },
});