import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function svg(label: string, value: string, active: boolean) {
  const lw = 92;
  const vw = Math.max(70, value.length * 7.2 + 34);
  const w = lw + vw;
  const accent = active ? "#f97316" : "#64748b";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="24" role="img" aria-label="${esc(label)}: ${esc(value)}">
<title>${esc(label)}: ${esc(value)}</title>
<rect width="${w}" height="24" rx="5" fill="#0b0f14"/>
<rect x="${lw}" width="${vw}" height="24" rx="5" fill="#161b22"/>
<rect x="${lw}" width="6" height="24" fill="#161b22"/>
<g font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="11" fill="#e6edf3">
<text x="10" y="16" font-weight="700">↑ ShippedIn</text>
<path d="M${lw + 12} 6c2 3 5 4 5 8a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-7z" fill="${accent}"/>
<text x="${lw + 24}" y="16">${esc(value)}</text>
</g></svg>`;
}

export const Route = createFileRoute("/api/public/badge/$username")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const raw = params.username.replace(/\.svg$/i, "");
        const headers = {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=300, s-maxage=300",
          "Access-Control-Allow-Origin": "*",
        };
        if (!/^[a-zA-Z0-9_-]{1,40}$/.test(raw)) {
          return new Response(svg("ShippedIn", "not found", false), { status: 404, headers });
        }
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              h.set("apikey", process.env.SUPABASE_PUBLISHABLE_KEY!);
              h.delete("Authorization");
              return fetch(input as any, { ...init, headers: h });
            },
          },
        });
        const { data } = await supabase
          .from("profiles")
          .select("streak_count")
          .ilike("username", raw)
          .maybeSingle();
        if (!data) return new Response(svg("ShippedIn", "not found", false), { status: 404, headers });
        const n = data.streak_count ?? 0;
        return new Response(svg("ShippedIn", `${n} day streak`, n > 0), { headers });
      },
    },
  },
});
