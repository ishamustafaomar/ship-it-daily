import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin only");
}

// ---------- Settings ----------
export const getAutopostSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("autopost_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

export const updateAutopostSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        enabled: z.boolean().optional(),
        post_hour_utc: z.number().int().min(0).max(23).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("autopost_settings")
      .update(data)
      .eq("id", 1)
      .select()
      .maybeSingle();
    if (error) throw error;
    return row;
  });

// ---------- History ----------
export const listAutopostHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("autopost_history")
      .select(
        "id, generated_at, category, generated_text, post_type, tool_tag, topic_tags, length_band, ship_id, published, published_at, scheduled_for, attempts, error",
      )
      .order("generated_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return rows ?? [];
  });

// ---------- Preview tomorrow's post (generate + save unpublished) ----------
export const previewAutopost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { generateAndSaveDraft } = await import("./autopost-generator.server");
    const { id, post } = await generateAndSaveDraft();
    return { id, ...post };
  });

// ---------- Regenerate an existing unpublished entry ----------
export const regenerateAutopost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateAutopost } = await import("./autopost-generator.server");
    const { data: row } = await supabaseAdmin
      .from("autopost_history")
      .select("published, category")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Not found");
    if (row.published) throw new Error("Already published — delete the ship first");
    const post = await generateAutopost({ category: row.category as any });
    const { error } = await supabaseAdmin
      .from("autopost_history")
      .update({
        generated_text: post.body,
        post_type: post.post_type,
        tool_tag: post.tool_tag,
        topic_tags: post.topic_tags,
        prompt: post.prompt,
        length_band: post.lengthBand,
        generated_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Edit a draft before publishing ----------
export const updateAutopostDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        generated_text: z.string().min(1).max(560).optional(),
        post_type: z.enum(["ship", "ask", "feedback", "discussion"]).optional(),
        tool_tag: z.string().max(24).nullable().optional(),
        topic_tags: z.array(z.string()).max(3).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("autopost_history").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Publish an existing draft ----------
export const publishAutopost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { publishGenerated } = await import("./autopost-generator.server");
    const result = await publishGenerated(data.id);
    return result;
  });

// ---------- Force post now (generate + publish immediately) ----------
export const forceAutopostNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { runDailyAutopost } = await import("./autopost-generator.server");
    return await runDailyAutopost();
  });

// ---------- Delete an entry (and its ship if published) ----------
export const deleteAutopostEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("autopost_history")
      .select("ship_id")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.ship_id) {
      await supabaseAdmin.from("ships").delete().eq("id", row.ship_id);
    }
    const { error } = await supabaseAdmin.from("autopost_history").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });