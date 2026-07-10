import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Shared admin guard: rejects unless caller has the 'admin' role.
async function assertAdmin(context: {
  supabase: any;
  userId: string;
}): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin only");
}

// ============= Is the current viewer an admin? =============
export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) return { admin: false };
    return { admin: !!data };
  });

// ============= Dashboard stats =============
export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 3600e3).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600e3).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 3600e3).toISOString();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const c = (q: any) => q.then((r: any) => r.count ?? 0);

    const [
      users,
      users24,
      users7,
      users30,
      ships,
      shipsToday,
      likes,
      follows,
      reports,
      activeStreaks,
    ] = await Promise.all([
      c(supabaseAdmin.from("profiles").select("id", { count: "exact", head: true })),
      c(supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", dayAgo)),
      c(supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo)),
      c(supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthAgo)),
      c(supabaseAdmin.from("ships").select("id", { count: "exact", head: true })),
      c(supabaseAdmin.from("ships").select("id", { count: "exact", head: true }).gte("created_at", startOfToday)),
      c(supabaseAdmin.from("likes").select("id", { count: "exact", head: true })),
      c(supabaseAdmin.from("follows").select("id", { count: "exact", head: true })),
      c(supabaseAdmin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open")),
      c(supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("streak_count", 2)),
    ]);

    // 30-day timeseries for signups and ships
    const [signupsRows, shipsRows] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("created_at")
        .gte("created_at", monthAgo),
      supabaseAdmin
        .from("ships")
        .select("created_at")
        .gte("created_at", monthAgo),
    ]);

    const bucket = (rows: any[]) => {
      const m: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 3600e3);
        m[d.toISOString().slice(0, 10)] = 0;
      }
      (rows ?? []).forEach((r: any) => {
        const key = String(r.created_at).slice(0, 10);
        if (key in m) m[key]++;
      });
      return Object.entries(m).map(([date, count]) => ({ date, count }));
    };

    // Top tools & topic tags
    const { data: recent } = await supabaseAdmin
      .from("ships")
      .select("tool_tag, topic_tags, created_at")
      .gte("created_at", weekAgo);

    const toolCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    (recent ?? []).forEach((r: any) => {
      if (r.tool_tag) toolCounts[r.tool_tag] = (toolCounts[r.tool_tag] ?? 0) + 1;
      (r.topic_tags ?? []).forEach((t: string) => {
        tagCounts[t] = (tagCounts[t] ?? 0) + 1;
      });
    });
    const topTools = Object.entries(toolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return {
      totals: {
        users,
        users24,
        users7,
        users30,
        ships,
        shipsToday,
        likes,
        follows,
        reports,
        activeStreaks,
      },
      signups: bucket(signupsRows.data ?? []),
      shipsSeries: bucket(shipsRows.data ?? []),
      topTools,
      topTags,
    };
  });

// ============= Users list =============
export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        q: z.string().optional().default(""),
        sort: z.enum(["created_at", "streak_count", "ship_count"]).default("created_at"),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    let query = supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, streak_count, longest_streak, last_ship_date, focus_tags, created_at")
      .limit(data.limit);

    if (data.q) {
      const like = `%${data.q}%`;
      query = query.or(`username.ilike.${like},display_name.ilike.${like}`);
    }

    if (data.sort === "created_at") query = query.order("created_at", { ascending: false });
    else if (data.sort === "streak_count") query = query.order("streak_count", { ascending: false });

    const { data: profiles, error } = await query;
    if (error) throw error;

    // Fetch emails via Auth Admin
    const emailMap: Record<string, string | null> = {};
    // Best-effort: batch listUsers up to 200
    try {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      (usersData?.users ?? []).forEach((u: any) => {
        emailMap[u.id] = u.email ?? null;
      });
    } catch {}

    // Ship counts per author
    const ids = (profiles ?? []).map((p: any) => p.id);
    const countMap: Record<string, number> = {};
    if (ids.length) {
      const { data: countRows } = await supabaseAdmin
        .from("ships")
        .select("author_id")
        .in("author_id", ids);
      (countRows ?? []).forEach((r: any) => {
        countMap[r.author_id] = (countMap[r.author_id] ?? 0) + 1;
      });
    }

    let out = (profiles ?? []).map((p: any) => ({
      ...p,
      email: emailMap[p.id] ?? null,
      ship_count: countMap[p.id] ?? 0,
    }));

    if (data.sort === "ship_count") {
      out = out.sort((a, b) => b.ship_count - a.ship_count);
    }

    return out;
  });

// ============= Single user detail =============
export const getAdminUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const [profileRes, shipsRes, followersRes, followingRes, authRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin
        .from("ships")
        .select("id, body, post_type, tool_tag, topic_tags, link_url, created_at, parent_ship_id")
        .eq("author_id", data.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin.from("follows").select("id", { count: "exact", head: true }).eq("following_id", data.id),
      supabaseAdmin.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", data.id),
      supabaseAdmin.auth.admin.getUserById(data.id).catch(() => ({ data: { user: null } })),
    ]);
    return {
      profile: profileRes.data,
      ships: shipsRes.data ?? [],
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
      email: (authRes as any).data?.user?.email ?? null,
      last_sign_in_at: (authRes as any).data?.user?.last_sign_in_at ?? null,
    };
  });

// ============= All ships =============
export const listAdminShips = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        q: z.string().optional().default(""),
        post_type: z.enum(["all", "ship", "ask", "feedback", "discussion"]).default("all"),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    let query = supabaseAdmin
      .from("ships")
      .select("id, body, post_type, tool_tag, topic_tags, link_url, image_url, author_id, parent_ship_id, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.post_type !== "all") query = query.eq("post_type", data.post_type);
    if (data.q) query = query.ilike("body", `%${data.q}%`);

    const { data: ships, error } = await query;
    if (error) throw error;

    const authorIds = Array.from(new Set((ships ?? []).map((s: any) => s.author_id)));
    const authorMap: Record<string, any> = {};
    if (authorIds.length) {
      const { data: authors } = await supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", authorIds);
      (authors ?? []).forEach((a: any) => {
        authorMap[a.id] = a;
      });
    }
    return (ships ?? []).map((s: any) => ({ ...s, author: authorMap[s.author_id] ?? null }));
  });

// ============= Delete ship =============
export const adminDeleteShip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.from("ships").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============= Delete user =============
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.id === context.userId) throw new Error("Cannot delete yourself");
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============= Recent activity stream =============
export const getAdminActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const [signupsRes, shipsRes, followsRes, likesRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("ships")
        .select("id, body, author_id, post_type, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("follows")
        .select("id, follower_id, following_id, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("likes")
        .select("id, user_id, ship_id, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const ids = Array.from(
      new Set([
        ...(signupsRes.data ?? []).map((r: any) => r.id),
        ...(shipsRes.data ?? []).map((r: any) => r.author_id),
        ...(followsRes.data ?? []).flatMap((r: any) => [r.follower_id, r.following_id]),
        ...(likesRes.data ?? []).map((r: any) => r.user_id),
      ]),
    );
    const profileMap: Record<string, any> = {};
    if (ids.length) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      (data ?? []).forEach((p: any) => {
        profileMap[p.id] = p;
      });
    }

    const items: Array<{
      kind: "signup" | "ship" | "follow" | "like";
      created_at: string;
      data: any;
    }> = [];
    (signupsRes.data ?? []).forEach((r: any) =>
      items.push({ kind: "signup", created_at: r.created_at, data: { profile: r } }),
    );
    (shipsRes.data ?? []).forEach((r: any) =>
      items.push({
        kind: "ship",
        created_at: r.created_at,
        data: { ...r, author: profileMap[r.author_id] ?? null },
      }),
    );
    (followsRes.data ?? []).forEach((r: any) =>
      items.push({
        kind: "follow",
        created_at: r.created_at,
        data: {
          ...r,
          follower: profileMap[r.follower_id] ?? null,
          following: profileMap[r.following_id] ?? null,
        },
      }),
    );
    (likesRes.data ?? []).forEach((r: any) =>
      items.push({
        kind: "like",
        created_at: r.created_at,
        data: { ...r, user: profileMap[r.user_id] ?? null },
      }),
    );

    items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return items.slice(0, 60);
  });

// ============= Reports queue =============
export const listAdminReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("reports")
      .select("id, reason, status, created_at, resolved_at, reporter_id, ship_id")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    const shipIds = Array.from(new Set((data ?? []).map((r: any) => r.ship_id)));
    const reporterIds = Array.from(new Set((data ?? []).map((r: any) => r.reporter_id)));
    const [shipsRes, profilesRes] = await Promise.all([
      shipIds.length
        ? supabaseAdmin.from("ships").select("id, body, author_id").in("id", shipIds)
        : Promise.resolve({ data: [] }),
      reporterIds.length
        ? supabaseAdmin.from("profiles").select("id, username, display_name").in("id", reporterIds)
        : Promise.resolve({ data: [] }),
    ]);
    const shipMap: Record<string, any> = {};
    (shipsRes.data ?? []).forEach((s: any) => (shipMap[s.id] = s));
    const reporterMap: Record<string, any> = {};
    (profilesRes.data ?? []).forEach((p: any) => (reporterMap[p.id] = p));

    return (data ?? []).map((r: any) => ({
      ...r,
      ship: shipMap[r.ship_id] ?? null,
      reporter: reporterMap[r.reporter_id] ?? null,
    }));
  });

export const resolveAdminReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("reports")
      .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: context.userId })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });