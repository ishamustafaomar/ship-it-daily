import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "has_shipped_today",
  title: "Check today's ship status",
  description:
    "Check whether the signed-in user has already posted a top-level ship in the current UTC day. Use this from a scheduled agent task before calling `daily_ship` to decide whether a post is needed.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
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
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("ships")
      .select("id, body, created_at")
      .eq("author_id", ctx.getUserId()!)
      .is("parent_ship_id", null)
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const shipped = !!data;
    return {
      content: [
        {
          type: "text",
          text: shipped
            ? `Already shipped today (id=${data!.id}).`
            : "No ship yet today — call daily_ship to keep the streak going.",
        },
      ],
      structuredContent: { shippedToday: shipped, ship: data ?? null },
    };
  },
});