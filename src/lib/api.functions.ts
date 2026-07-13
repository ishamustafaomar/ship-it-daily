import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";

function createAnonSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", process.env.SUPABASE_PUBLISHABLE_KEY!);
        headers.delete("Authorization");
        return fetch(input as any, { ...init, headers });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
const ANON_UUID = "00000000-0000-0000-0000-000000000000";

// Only allow http(s) links — blocks javascript:, data:, vbscript:, etc.
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

// ============= Shape for feed items =============
export type FeedShip = {
  id: string;
  author_id: string;
  body: string;
  tool_tag: string | null;
  link_url: string | null;
  image_url: string | null;
  image_signed_url: string | null;
  parent_ship_id: string | null;
  post_type: "ship" | "ask" | "feedback" | "discussion";
  topic_tags: string[];
  created_at: string;
  author: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  like_count: number;
  reship_count: number;
  reply_count: number;
  liked_by_me: boolean;
  reshipped_by_me: boolean;
  reactions: { emoji: string; count: number; mine: boolean }[];
};

export const REACTION_EMOJIS = ["🔥", "🚀", "👏", "💡", "🎉"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

// Normalize a tag: lowercase, trim, non-alnum → dash, collapse dashes, max 24.
export function normalizeTag(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}
const tagArray = (max: number) =>
  z
    .array(z.string())
    .max(max)
    .transform((arr) =>
      Array.from(
        new Set(arr.map(normalizeTag).filter((t) => t.length >= 2)),
      ).slice(0, max),
    );

async function decorateShips(
  supabase: any,
  userId: string,
  rows: any[],
): Promise<FeedShip[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));

  const [likesRes, reshipsRes, repliesRes, myLikesRes, myReshipsRes, authorsRes] =
    await Promise.all([
      supabase.from("likes").select("ship_id").in("ship_id", ids),
      supabase.from("reships").select("ship_id").in("ship_id", ids),
      supabase.from("ships").select("parent_ship_id").in("parent_ship_id", ids),
      supabase.from("likes").select("ship_id").eq("user_id", userId).in("ship_id", ids),
      supabase.from("reships").select("ship_id").eq("user_id", userId).in("ship_id", ids),
      supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", authorIds),
    ]);

  const [reactionsRes, myReactionsRes] = await Promise.all([
    supabase.from("reactions").select("ship_id, emoji").in("ship_id", ids),
    supabase.from("reactions").select("ship_id, emoji").eq("user_id", userId).in("ship_id", ids),
  ]);
  const reactionMap: Record<string, Record<string, number>> = {};
  (reactionsRes.data ?? []).forEach((r: any) => {
    reactionMap[r.ship_id] ??= {};
    reactionMap[r.ship_id][r.emoji] = (reactionMap[r.ship_id][r.emoji] ?? 0) + 1;
  });
  const myReactionSet = new Set(
    (myReactionsRes.data ?? []).map((r: any) => `${r.ship_id}:${r.emoji}`),
  );

  const count = (arr: any[] | null, key = "ship_id") => {
    const m: Record<string, number> = {};
    (arr ?? []).forEach((x: any) => {
      m[x[key]] = (m[x[key]] ?? 0) + 1;
    });
    return m;
  };
  const likeMap = count(likesRes.data);
  const reshipMap = count(reshipsRes.data);
  const replyMap = count(repliesRes.data, "parent_ship_id");
  const myLikes = new Set((myLikesRes.data ?? []).map((x: any) => x.ship_id));
  const myReships = new Set((myReshipsRes.data ?? []).map((x: any) => x.ship_id));
  const authors: Record<string, any> = {};
  (authorsRes.data ?? []).forEach((a: any) => {
    authors[a.id] = a;
  });

  // sign image paths
  const paths = rows.map((r) => r.image_url).filter(Boolean) as string[];
  const signedMap: Record<string, string> = {};
  if (paths.length) {
    const { data } = await supabase.storage.from("ship-images").createSignedUrls(paths, 3600);
    (data ?? []).forEach((s: any) => {
      if (s.path && s.signedUrl) signedMap[s.path] = s.signedUrl;
    });
  }

  return rows.map((r) => ({
    id: r.id,
    author_id: r.author_id,
    body: r.body,
    tool_tag: r.tool_tag,
    link_url: r.link_url,
    image_url: r.image_url,
    image_signed_url: r.image_url ? signedMap[r.image_url] ?? null : null,
    parent_ship_id: r.parent_ship_id,
    post_type: (r.post_type ?? "ship") as FeedShip["post_type"],
    topic_tags: (r.topic_tags ?? []) as string[],
    created_at: r.created_at,
    author: authors[r.author_id] ?? { id: r.author_id, username: null, display_name: null, avatar_url: null },
    like_count: likeMap[r.id] ?? 0,
    reship_count: reshipMap[r.id] ?? 0,
    reply_count: replyMap[r.id] ?? 0,
    liked_by_me: myLikes.has(r.id),
    reshipped_by_me: myReships.has(r.id),
    reactions: Object.entries(reactionMap[r.id] ?? {})
      .map(([emoji, count]) => ({
        emoji,
        count: count as number,
        mine: myReactionSet.has(`${r.id}:${emoji}`),
      }))
      .sort((a, b) => b.count - a.count),
  }));
}

// ============= Current viewer's profile =============
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

// ============= Set username/display_name during onboarding =============
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        username: z.string().min(2).max(24).regex(/^[a-z0-9_]+$/i).optional(),
        display_name: z.string().min(1).max(60).optional(),
        bio: z.string().max(280).nullable().optional(),
        building_now: z.string().max(120).nullable().optional(),
        avatar_url: z.string().url().nullable().optional(),
        focus_tags: tagArray(5).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const payload = { ...data } as typeof data;
    if (payload.username) payload.username = payload.username.toLowerCase();
    const { data: row, error } = await context.supabase
      .from("profiles")
      .update(payload)
      .eq("id", context.userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return row;
  });

// ============= Get profile by username =============
export const getProfileByUsername = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ username: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("*")
      .ilike("username", data.username)
      .maybeSingle();
    if (error) throw error;
    if (!profile) return null;

    const [{ count: followers }, { count: following }, { data: followRow }] = await Promise.all([
      context.supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profile.id),
      context.supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profile.id),
      context.supabase.from("follows").select("id").eq("follower_id", context.userId).eq("following_id", profile.id).maybeSingle(),
    ]);

    const { data: shipsRows } = await context.supabase
      .from("ships")
      .select("*")
      .eq("author_id", profile.id)
      .is("parent_ship_id", null)
      .order("created_at", { ascending: false })
      .limit(50);
    const ships = await decorateShips(context.supabase, context.userId, shipsRows ?? []);

    return {
      profile,
      followers: followers ?? 0,
      following: following ?? 0,
      is_following: !!followRow,
      is_me: profile.id === context.userId,
      ships,
    };
  });

// ============= Public profile view (no auth) =============
export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ username: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const supabase = createAnonSupabase();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", data.username)
      .maybeSingle();
    if (error) throw error;
    if (!profile) return null;

    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profile.id),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profile.id),
    ]);

    const { data: shipsRows } = await supabase
      .from("ships")
      .select("*")
      .eq("author_id", profile.id)
      .is("parent_ship_id", null)
      .order("created_at", { ascending: false })
      .limit(50);
    const ships = await decorateShips(supabase, ANON_UUID, shipsRows ?? []);

    return {
      profile,
      followers: followers ?? 0,
      following: following ?? 0,
      is_following: false,
      is_me: false,
      ships,
    };
  });

// ============= Feed =============
export const getFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        tab: z.enum(["following", "for_you", "relevant"]),
        cursor: z.string().nullable().optional(),
        limit: z.number().min(1).max(50).optional(),
        tag: z.string().nullable().optional(),
        tool: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const limit = data.limit ?? 20;
    let query = context.supabase
      .from("ships")
      .select("*")
      .is("parent_ship_id", null)
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    if (data.cursor) query = query.lt("created_at", data.cursor);
    if (data.tab === "following") {
      const { data: follows } = await context.supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", context.userId);
      const ids = (follows ?? []).map((f: any) => f.following_id);
      ids.push(context.userId);
      query = query.in("author_id", ids);
    }
    if (data.tab === "relevant" && !data.tag) {
      const { data: me } = await context.supabase
        .from("profiles")
        .select("focus_tags")
        .eq("id", context.userId)
        .maybeSingle();
      const focus = (me?.focus_tags ?? []) as string[];
      if (focus.length === 0) {
        return { items: [], nextCursor: null, needsFocus: true };
      }
      query = query.overlaps("topic_tags", focus);
    }
    if (data.tag) {
      const t = normalizeTag(data.tag);
      if (t) query = query.contains("topic_tags", [t]);
    }
    if (data.tool) {
      query = query.eq("tool_tag", data.tool);
    }
    const { data: rows, error } = await query;
    if (error) throw error;
    const hasMore = (rows?.length ?? 0) > limit;
    const slice = (rows ?? []).slice(0, limit);
    const items = await decorateShips(context.supabase, context.userId, slice);
    return {
      items,
      nextCursor: hasMore ? slice[slice.length - 1].created_at : null,
      needsFocus: false,
    };
  });

// ============= Ship detail =============
export const getShipDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ shipId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("ships")
      .select("*")
      .eq("id", data.shipId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;
    const [decoratedParent] = await decorateShips(context.supabase, context.userId, [row]);
    const { data: replies } = await context.supabase
      .from("ships")
      .select("*")
      .eq("parent_ship_id", data.shipId)
      .order("created_at", { ascending: true });
    const decoratedReplies = await decorateShips(context.supabase, context.userId, replies ?? []);
    return { ship: decoratedParent, replies: decoratedReplies };
  });

// ============= Create ship =============
export const createShip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        body: z.string().min(1).max(560),
        tool_tag: z.string().max(24).nullable().optional(),
        link_url: httpUrl.nullable().optional(),
        image_url: z.string().nullable().optional(),
        parent_ship_id: z.string().uuid().nullable().optional(),
        post_type: z.enum(["ship", "ask", "feedback", "discussion"]).optional(),
        topic_tags: tagArray(3).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("ships")
      .insert({
        author_id: context.userId,
        body: data.body,
        tool_tag: data.tool_tag ?? null,
        link_url: data.link_url ?? null,
        image_url: data.image_url ?? null,
        parent_ship_id: data.parent_ship_id ?? null,
        post_type: data.post_type ?? "ship",
        topic_tags: data.topic_tags ?? [],
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

// ============= Delete ship =============
export const deleteShip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ shipId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("ships").delete().eq("id", data.shipId);
    if (error) throw error;
    return { ok: true };
  });

// ============= Like / unlike =============
export const toggleLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ shipId: z.string().uuid(), liked: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    if (data.liked) {
      await context.supabase.from("likes").insert({ ship_id: data.shipId, user_id: context.userId }).select();
    } else {
      await context.supabase.from("likes").delete().eq("ship_id", data.shipId).eq("user_id", context.userId);
    }
    return { ok: true };
  });

// ============= Reship / unreship =============
export const toggleReship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ shipId: z.string().uuid(), reshipped: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    if (data.reshipped) {
      await context.supabase.from("reships").insert({ ship_id: data.shipId, user_id: context.userId }).select();
    } else {
      await context.supabase.from("reships").delete().eq("ship_id", data.shipId).eq("user_id", context.userId);
    }
    return { ok: true };
  });

// ============= Toggle emoji reaction =============
export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        shipId: z.string().uuid(),
        emoji: z.enum(["🔥", "🚀", "👏", "💡", "🎉"]),
        active: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    if (data.active) {
      await context.supabase
        .from("reactions")
        .insert({ ship_id: data.shipId, user_id: context.userId, emoji: data.emoji })
        .select();
    } else {
      await context.supabase
        .from("reactions")
        .delete()
        .eq("ship_id", data.shipId)
        .eq("user_id", context.userId)
        .eq("emoji", data.emoji);
    }
    return { ok: true };
  });

// ============= Follow / unfollow =============
export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ profileId: z.string().uuid(), following: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    if (data.profileId === context.userId) return { ok: false };
    if (data.following) {
      await context.supabase.from("follows").insert({ follower_id: context.userId, following_id: data.profileId }).select();
    } else {
      await context.supabase.from("follows").delete().eq("follower_id", context.userId).eq("following_id", data.profileId);
    }
    return { ok: true };
  });

// ============= Notifications =============
export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const actorIds = Array.from(new Set((rows ?? []).map((r: any) => r.actor_id)));
    const { data: actors } = await context.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", actorIds);
    const actorMap: Record<string, any> = {};
    (actors ?? []).forEach((a: any) => {
      actorMap[a.id] = a;
    });
    return (rows ?? []).map((r: any) => ({ ...r, actor: actorMap[r.actor_id] ?? null }));
  });

export const getUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", context.userId)
      .eq("read", false);
    return { count: count ?? 0 };
  });

export const markAllRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_id", context.userId)
      .eq("read", false);
    return { ok: true };
  });

// ============= Suggested builders + trending tools =============
export const getRightRail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [meRes, followsRes, profilesRes, recentShipsRes] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("follows").select("following_id").eq("follower_id", context.userId),
      context.supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, building_now, streak_count")
        .not("username", "is", null)
        .neq("id", context.userId)
        .order("streak_count", { ascending: false })
        .limit(20),
      context.supabase
        .from("ships")
        .select("tool_tag, created_at")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
        .not("tool_tag", "is", null),
    ]);

    const followingSet = new Set((followsRes.data ?? []).map((f: any) => f.following_id));
    const suggestions = (profilesRes.data ?? [])
      .filter((p: any) => !followingSet.has(p.id))
      .slice(0, 5);

    const toolCounts: Record<string, number> = {};
    (recentShipsRes.data ?? []).forEach((r: any) => {
      if (r.tool_tag) toolCounts[r.tool_tag] = (toolCounts[r.tool_tag] ?? 0) + 1;
    });
    const trending = Object.entries(toolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    return { me: meRes.data, suggestions, trending };
  });

// ============= Topic tag suggestions (for composer autocomplete) =============
export const getTagSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ q: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    // Pull recent ships and count topic tag frequencies.
    const { data: rows } = await context.supabase
      .from("ships")
      .select("topic_tags")
      .not("topic_tags", "eq", "{}")
      .order("created_at", { ascending: false })
      .limit(500);
    const counts: Record<string, number> = {};
    (rows ?? []).forEach((r: any) => {
      (r.topic_tags ?? []).forEach((t: string) => {
        counts[t] = (counts[t] ?? 0) + 1;
      });
    });
    const q = (data.q ?? "").toLowerCase().trim();
    const items = Object.entries(counts)
      .filter(([tag]) => (q ? tag.includes(q) : true))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));
    return { items };
  });