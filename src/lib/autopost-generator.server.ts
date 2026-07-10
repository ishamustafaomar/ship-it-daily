// Server-only generator for daily autoposts. Calls the Lovable AI Gateway.
// Modular by design: `generateAutopost()` picks a category via weighted RNG,
// builds a prompt with recent-history dedupe context, and validates output.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Category =
  | "discussion"
  | "question"
  | "tip"
  | "launch"
  | "poll"
  | "feedback"
  | "productivity"
  | "ai_tools"
  | "programming"
  | "design"
  | "indie_hacking"
  | "funny"
  | "motivation"
  | "business_lesson"
  | "marketing"
  | "growth"
  | "milestone"
  | "random_thought"
  | "fun_fact"
  | "open_question"
  | "product_rec"
  | "startup_question";

type Weighted<T> = { value: T; weight: number };

const CATEGORY_WEIGHTS: Weighted<Category>[] = [
  { value: "discussion", weight: 30 },
  { value: "question", weight: 12 },
  { value: "startup_question", weight: 8 },
  { value: "tip", weight: 15 },
  { value: "launch", weight: 10 },
  { value: "poll", weight: 10 },
  { value: "feedback", weight: 5 },
  { value: "productivity", weight: 2 },
  { value: "ai_tools", weight: 2 },
  { value: "programming", weight: 1 },
  { value: "design", weight: 1 },
  { value: "indie_hacking", weight: 1 },
  { value: "funny", weight: 1 },
  { value: "motivation", weight: 0.5 },
  { value: "business_lesson", weight: 0.5 },
  { value: "marketing", weight: 0.5 },
  { value: "growth", weight: 0.5 },
  { value: "milestone", weight: 0.5 },
  { value: "random_thought", weight: 0.5 },
  { value: "fun_fact", weight: 0.5 },
  { value: "open_question", weight: 0.5 },
  { value: "product_rec", weight: 0.5 },
];

const LENGTH_BANDS: Weighted<{ label: string; min: number; max: number }>[] = [
  { value: { label: "short", min: 25, max: 60 }, weight: 25 },
  { value: { label: "medium", min: 60, max: 120 }, weight: 55 },
  { value: { label: "long", min: 120, max: 180 }, weight: 20 },
];

function pickWeighted<T>(items: Weighted<T>[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function categoryBrief(cat: Category): { instruction: string; postType: "ship" | "ask" | "feedback" | "discussion" } {
  switch (cat) {
    case "discussion":
      return {
        postType: "discussion",
        instruction:
          "Start a casual builder discussion. Share a real-sounding opinion or observation about building software. Invite others to weigh in with a subtle open question at the end (not always literal — could just be a curious observation).",
      };
    case "question":
      return {
        postType: "ask",
        instruction:
          "Ask an honest question a solo dev might actually have. Concrete, specific, no filler. Not rhetorical — sound like you actually want answers.",
      };
    case "startup_question":
      return {
        postType: "ask",
        instruction:
          "Ask a real startup / indie hacker question — pricing, positioning, launch timing, first users, retention, distribution, that sort of thing.",
      };
    case "tip":
      return {
        postType: "ship",
        instruction:
          "Share a specific, actionable tip you learned building with AI tools. One idea, not a listicle. Concrete over abstract.",
      };
    case "launch":
      return {
        postType: "ship",
        instruction:
          "A believable indie project launch or small ship. First person. Realistic scope (weekend project, tiny tool, side thing). No inflated claims. Optionally hint at what you used to build it via `tool_tag`. Do NOT include a fake URL.",
      };
    case "poll":
      return {
        postType: "discussion",
        instruction:
          "Write a short poll-style post. Format:\nOne short question on the first line.\nThen 3-4 options each on their own line prefixed with '• '. Keep options short.",
      };
    case "feedback":
      return {
        postType: "feedback",
        instruction:
          "Ask the community for feedback on something concrete — a decision, an approach, a naming choice, a UX pattern. Sound like you actually want input.",
      };
    case "productivity":
      return { postType: "discussion", instruction: "Share a productivity or focus insight from building solo." };
    case "ai_tools":
      return { postType: "discussion", instruction: "Talk about workflow with AI coding tools — comparisons, quirks, or preferences." };
    case "programming":
      return { postType: "discussion", instruction: "Programming observation — a subtle lesson, a gotcha, a preference." };
    case "design":
      return { postType: "discussion", instruction: "A design or UX opinion, concrete and personal." };
    case "indie_hacking":
      return { postType: "discussion", instruction: "An indie hacking observation about shipping small products." };
    case "funny":
      return { postType: "discussion", instruction: "A short, funny, relatable dev moment. Understated humor, not try-hard." };
    case "motivation":
      return { postType: "discussion", instruction: "A grounded, non-cringe motivational thought about shipping consistently. No hustle-culture cliches." };
    case "business_lesson":
      return { postType: "discussion", instruction: "A short lesson learned running or trying to run a small business." };
    case "marketing":
      return { postType: "discussion", instruction: "A marketing observation for small builders. Practical." };
    case "growth":
      return { postType: "discussion", instruction: "A growth or distribution observation from indie building." };
    case "milestone":
      return { postType: "ship", instruction: "Quietly celebrate a small milestone. Understated, believable numbers." };
    case "random_thought":
      return { postType: "discussion", instruction: "A stray thought about building software. Casual, ~1-2 sentences." };
    case "fun_fact":
      return { postType: "discussion", instruction: "Share a genuinely interesting fact about tech, computing history, or a tool. Something that makes you go 'huh'." };
    case "open_question":
      return { postType: "ask", instruction: "Post an open-ended prompt to the community: 'What are you building today?' style, but rephrased freshly." };
    case "product_rec":
      return { postType: "discussion", instruction: "Recommend a specific tool or product you actually like. Say why in one line. No shilling." };
  }
}

// Common AI tools to occasionally tag with
const TOOL_POOL = ["Lovable", "Cursor", "v0", "Bolt", "Replit", "Windsurf", "Claude", "ChatGPT", "Codex"];

function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function trigrams(s: string): Set<string> {
  const n = normalizeForCompare(s);
  const out = new Set<string>();
  for (let i = 0; i <= n.length - 3; i++) out.add(n.slice(i, i + 3));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function tooSimilar(candidate: string, previous: string[], threshold = 0.55): boolean {
  const c = trigrams(candidate);
  const first = normalizeForCompare(candidate).slice(0, 40);
  for (const p of previous) {
    const pt = trigrams(p);
    if (jaccard(c, pt) >= threshold) return true;
    // Also reject if opening phrase matches
    const pFirst = normalizeForCompare(p).slice(0, 40);
    if (first && pFirst && first === pFirst) return true;
  }
  return false;
}

async function fetchRecentHistoryBodies(limit = 100): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("autopost_history")
    .select("generated_text")
    .order("generated_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: any) => r.generated_text as string);
}

function buildPrompt(cat: Category, band: { label: string; min: number; max: number }, recent: string[]): string {
  const { instruction, postType } = categoryBrief(cat);
  const recentPreview = recent.slice(0, 20).map((t, i) => `${i + 1}. ${t.slice(0, 180)}`).join("\n");
  return `You write a single social feed post for ShippedIn — a community of indie builders who ship things using AI coding tools.

CATEGORY: ${cat}
BRIEF: ${instruction}
TARGET LENGTH: ${band.min}-${band.max} words (aim near the middle).
POST_TYPE to use: ${postType}

HARD RULES:
- Sound like a real builder, first person.
- NEVER mention being AI, being a bot, or being generated.
- No corporate voice. No buzzwords ("unlock", "leverage", "empower", "revolutionize").
- No hashtags unless one feels 100% natural.
- Emojis: usually none. At most one, only if it genuinely fits.
- Vary sentence length. Sometimes one sentence, sometimes 2-3 short paragraphs.
- No opening cliches ("Hot take:", "Unpopular opinion:", "PSA:", "Just shipped:", "Quick tip:"). Vary opening phrasing.
- Do NOT copy or paraphrase the recent posts below. Different topic, different opening, different angle.
- No fake URLs. No fake numbers that sound impossible.
- No @mentions.

RECENT AUTOPOSTS (avoid overlap with these):
${recentPreview || "(none yet)"}

Return STRICT JSON with this shape and NOTHING else:
{
  "body": string,          // the post text
  "post_type": "${postType}",
  "tool_tag": string | null,  // one of Lovable, Cursor, v0, Bolt, Replit, Windsurf, Claude, ChatGPT, Codex — or null. Only set when it naturally fits (mostly for launches/tips).
  "topic_tags": string[]   // 0-3 short lowercase topic tags (single words or short phrases), no leading '#'
}`;
}

export type GeneratedPost = {
  category: Category;
  lengthBand: string;
  prompt: string;
  body: string;
  post_type: "ship" | "ask" | "feedback" | "discussion";
  tool_tag: string | null;
  topic_tags: string[];
};

async function callGateway(prompt: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You output only strict JSON matching the requested schema." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI Gateway ${res.status}: ${txt.slice(0, 400)}`);
  }
  const json: any = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("Empty AI response");
  return content;
}

function safeParse(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Failed to parse AI JSON");
  }
}

function normalizeTopic(t: string): string {
  return t.toLowerCase().trim().replace(/^#/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24);
}

export async function generateAutopost(opts?: { category?: Category }): Promise<GeneratedPost> {
  const category = opts?.category ?? pickWeighted(CATEGORY_WEIGHTS);
  const band = pickWeighted(LENGTH_BANDS);
  const recent = await fetchRecentHistoryBodies(100);

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const prompt = buildPrompt(category, band, recent);
      const raw = await callGateway(prompt);
      const parsed = safeParse(raw);
      const body = String(parsed.body ?? "").trim();
      if (!body || body.length < 8) throw new Error("Empty body");
      if (body.length > 560) throw new Error("Body too long");
      if (tooSimilar(body, recent)) {
        // regenerate on next iteration with the same category
        throw new Error("Too similar to recent posts");
      }
      const post_type = ["ship", "ask", "feedback", "discussion"].includes(parsed.post_type)
        ? parsed.post_type
        : categoryBrief(category).postType;
      const rawTool = typeof parsed.tool_tag === "string" ? parsed.tool_tag : null;
      const tool_tag = rawTool && TOOL_POOL.some((t) => t.toLowerCase() === rawTool.toLowerCase())
        ? TOOL_POOL.find((t) => t.toLowerCase() === rawTool.toLowerCase())!
        : null;
      const topic_tags = Array.isArray(parsed.topic_tags)
        ? Array.from(
            new Set(
              (parsed.topic_tags as unknown[])
                .map((t) => normalizeTopic(String(t ?? "")))
                .filter((t) => t.length >= 2),
            ),
          ).slice(0, 3)
        : [];

      return { category, lengthBand: band.label, prompt, body, post_type, tool_tag, topic_tags };
    } catch (err) {
      lastError = err;
      console.warn(`[autopost] attempt ${attempt + 1} failed:`, (err as Error).message);
    }
  }
  throw new Error(`Generation failed after 3 attempts: ${(lastError as Error)?.message ?? "unknown"}`);
}

// Ensure a bot user + profile exists; return its uuid.
export async function ensureBotUser(): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("autopost_settings")
    .select("bot_user_id")
    .eq("id", 1)
    .maybeSingle();
  if (existing?.bot_user_id) return existing.bot_user_id;

  const email = "shippedin-bot@shippedin.dev";
  let botId: string | null = null;

  // Try to find existing auth user
  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = (data?.users ?? []).find((u: any) => (u.email ?? "").toLowerCase() === email);
    if (found) botId = found.id;
  } catch (e) {
    console.warn("[autopost] listUsers failed:", (e as Error).message);
  }

  if (!botId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: "ShippedIn", name: "shippedin" },
    });
    if (error) throw new Error(`Failed to create bot user: ${error.message}`);
    botId = data.user!.id;
  }

  // Ensure profile row has proper username / display_name.
  await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: botId,
        username: "shippedin",
        display_name: "ShippedIn",
        bio: "The daily pulse of what people are building.",
      },
      { onConflict: "id" },
    );

  await supabaseAdmin.from("autopost_settings").update({ bot_user_id: botId }).eq("id", 1);
  return botId;
}

// Publish a generated post as a real ship authored by the bot, and mark history published.
export async function publishGenerated(
  historyId: string,
  overrides?: { body?: string; post_type?: string; tool_tag?: string | null; topic_tags?: string[] },
): Promise<{ shipId: string }> {
  const { data: row, error: hErr } = await supabaseAdmin
    .from("autopost_history")
    .select("*")
    .eq("id", historyId)
    .maybeSingle();
  if (hErr || !row) throw new Error("History entry not found");
  if (row.published) throw new Error("Already published");

  const botId = await ensureBotUser();

  const body = (overrides?.body ?? row.generated_text).trim();
  if (!body) throw new Error("Empty body");
  const post_type = overrides?.post_type ?? row.post_type ?? "discussion";
  const tool_tag = overrides && "tool_tag" in overrides ? overrides.tool_tag ?? null : row.tool_tag;
  const topic_tags = overrides?.topic_tags ?? row.topic_tags ?? [];

  const { data: ship, error: sErr } = await supabaseAdmin
    .from("ships")
    .insert({
      author_id: botId,
      body,
      post_type,
      tool_tag,
      topic_tags,
      is_autoposted: true,
    })
    .select("id")
    .single();
  if (sErr) throw sErr;

  await supabaseAdmin
    .from("autopost_history")
    .update({
      published: true,
      published_at: new Date().toISOString(),
      ship_id: ship.id,
      generated_text: body,
      post_type,
      tool_tag,
      topic_tags,
      error: null,
    })
    .eq("id", historyId);

  return { shipId: ship.id };
}

// Generate a post and save it to history as an unpublished draft. Returns the row id.
export async function generateAndSaveDraft(scheduledFor?: string): Promise<{ id: string; post: GeneratedPost }> {
  const post = await generateAutopost();
  const { data, error } = await supabaseAdmin
    .from("autopost_history")
    .insert({
      category: post.category,
      prompt: post.prompt,
      generated_text: post.body,
      post_type: post.post_type,
      tool_tag: post.tool_tag,
      topic_tags: post.topic_tags,
      length_band: post.lengthBand,
      published: false,
      scheduled_for: scheduledFor ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id, post };
}

// Full daily flow: generate + publish, with 3 retries on generation error.
export async function runDailyAutopost(): Promise<{
  historyId: string;
  shipId: string;
  attempts: number;
}> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { id, post } = await generateAndSaveDraft();
      try {
        const { shipId } = await publishGenerated(id);
        await supabaseAdmin
          .from("autopost_history")
          .update({ attempts: attempt })
          .eq("id", id);
        return { historyId: id, shipId, attempts: attempt };
      } catch (pubErr) {
        await supabaseAdmin
          .from("autopost_history")
          .update({ error: (pubErr as Error).message, attempts: attempt })
          .eq("id", id);
        void post;
        throw pubErr;
      }
    } catch (err) {
      lastErr = err;
      console.error(`[autopost] daily run attempt ${attempt} failed:`, (err as Error).message);
    }
  }
  throw new Error(`Daily autopost failed after 3 attempts: ${(lastErr as Error)?.message ?? "unknown"}`);
}