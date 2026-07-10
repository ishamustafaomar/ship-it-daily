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
  name: "daily_ship",
  title: "Post today's ship (idempotent)",
  description:
    "Post the signed-in user's daily ship to ShippedIn to keep the streak going. Idempotent: if the user has already posted a top-level ship in the current UTC day, this returns the existing ship instead of creating a duplicate. Safe to call once per day on a schedule from an AI agent (e.g. ChatGPT/Claude scheduled tasks). Pass `force: true` to post an additional ship even if one exists today.",
  inputSchema: {
    body: z.string().min(1).max(560).describe("What you shipped today (max 560 chars)."),
    post_type: z.enum(["ship", "ask", "feedback", "discussion"]).default("ship"),
    tool_tag: z.string().max(24).nullish().describe("Optional AI tool tag (e.g. 'Lovable', 'Cursor')."),
    link_url: httpUrl.nullish().describe("Optional http(s) URL to link to."),
    topic_tags: z.array(z.string().max(24)).max(3).optional().describe("Up to 3 topic tags."),
    force: z.boolean().default(false).describe("Post even if a ship already exists today."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ body, post_type, tool_tag, link_url, topic_tags, force }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId()!;
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );

    const startOfUtcDay = new Date();
    startOfUtcDay.setUTCHours(0, 0, 0, 0);

    if (!force) {
      const { data: existing } = await supabase
        .from("ships")
        .select("id, body, post_type, tool_tag, link_url, created_at")
        .eq("author_id", userId)
        .is("parent_ship_id", null)
        .gte("created_at", startOfUtcDay.toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        return {
          content: [
            {
              type: "text",
              text: `Already shipped today (id=${existing.id}). Streak is safe — skipping. Pass force=true to post another.`,
            },
          ],
          structuredContent: { ship: existing, created: false, alreadyShippedToday: true },
        };
      }
    }

    const normalizedTags = Array.from(
      new Set(
        (topic_tags ?? [])
          .map((t) =>
            t
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")
              .slice(0, 24),
          )
          .filter((t) => t.length >= 2),
      ),
    ).slice(0, 3);

    const { data, error } = await supabase
      .from("ships")
      .insert({
        author_id: userId,
        body,
        post_type,
        tool_tag: tool_tag ?? null,
        link_url: link_url ?? null,
        topic_tags: normalizedTags,
      })
      .select("id, body, post_type, tool_tag, link_url, topic_tags, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Shipped! id=${data.id} — streak updated.` }],
      structuredContent: { ship: data, created: true, alreadyShippedToday: false },
    };
  },
});