import { createFileRoute } from "@tanstack/react-router";

// Scheduled daily autopost endpoint. Meant to be called hourly by pg_cron.
// It checks the configured UTC hour and posts once per day when it matches.
// Also accepts { force: true } to bypass the schedule (used by admin "post now").
export const Route = createFileRoute("/api/public/hooks/autopost")({
  server: {
    handlers: {
      GET: async () => {
        return json(
          {
            ok: true,
            endpoint: "autopost",
            method: "POST",
            note: "This is a cron-only endpoint. Send POST with Authorization: Bearer <CRON_SECRET>.",
          },
          200,
        );
      },
      POST: async ({ request }) => {
        try {
          const expected = process.env.CRON_SECRET;
          if (!expected) {
            return json({ ok: false, error: "server not configured" }, 500);
          }
          const auth = request.headers.get("authorization") ?? "";
          const bearer = auth.toLowerCase().startsWith("bearer ")
            ? auth.slice(7).trim()
            : "";
          const headerSecret = request.headers.get("x-cron-secret") ?? "";
          const provided = bearer || headerSecret;
          if (!provided || provided !== expected) {
            return json({ ok: false, error: "unauthorized" }, 401);
          }
          const body = await request.json().catch(() => ({}));
          const force = !!body?.force;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: settings, error: sErr } = await supabaseAdmin
            .from("autopost_settings")
            .select("*")
            .eq("id", 1)
            .maybeSingle();
          if (sErr) throw sErr;
          if (!settings) {
            return json({ ok: false, skipped: "no settings row" }, 200);
          }
          if (!force) {
            if (!settings.enabled) {
              return json({ ok: true, skipped: "disabled" }, 200);
            }
            const nowHourUtc = new Date().getUTCHours();
            if (nowHourUtc !== settings.post_hour_utc) {
              return json({ ok: true, skipped: `hour ${nowHourUtc} != ${settings.post_hour_utc}` }, 200);
            }
            // Already posted today?
            const start = new Date();
            start.setUTCHours(0, 0, 0, 0);
            const { count } = await supabaseAdmin
              .from("autopost_history")
              .select("id", { count: "exact", head: true })
              .eq("published", true)
              .gte("published_at", start.toISOString());
            if ((count ?? 0) > 0) {
              return json({ ok: true, skipped: "already posted today" }, 200);
            }
          }

          const { runDailyAutopost } = await import("@/lib/autopost-generator.server");
          const result = await runDailyAutopost();
          await supabaseAdmin
            .from("autopost_settings")
            .update({ last_run_at: new Date().toISOString() })
            .eq("id", 1);
          return json({ ok: true, ...result }, 200);
        } catch (err) {
          console.error("[autopost cron] failed:", (err as Error).message);
          return json({ ok: false, error: (err as Error).message }, 500);
        }
      },
    },
  },
});

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}