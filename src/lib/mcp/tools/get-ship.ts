import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "get_ship",
  title: "Get a ship with its replies",
  description: "Fetch a single ShippedIn ship by ID along with its threaded replies.",
  inputSchema: {
    ship_id: z.string().uuid().describe("The ship ID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ ship_id }, ctx) => {
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
    const cols = "id, author_id, body, tool_tag, link_url, post_type, parent_ship_id, created_at";
    const { data: ship, error } = await supabase.from("ships").select(cols).eq("id", ship_id).maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!ship) return { content: [{ type: "text", text: "Not found" }], isError: true };
    const { data: replies } = await supabase
      .from("ships")
      .select(cols)
      .eq("parent_ship_id", ship_id)
      .order("created_at", { ascending: true });
    return {
      content: [{ type: "text", text: JSON.stringify({ ship, replies: replies ?? [] }, null, 2) }],
      structuredContent: { ship, replies: replies ?? [] },
    };
  },
});