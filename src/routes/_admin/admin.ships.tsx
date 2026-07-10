import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAdminShips, adminDeleteShip } from "@/lib/admin.functions";
import { UserAvatar } from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/ships")({
  component: AdminShips,
});

const TYPES = ["all", "ship", "ask", "feedback", "discussion"] as const;

function AdminShips() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const qc = useQueryClient();
  const fn = useServerFn(listAdminShips);
  const delFn = useServerFn(adminDeleteShip);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ships", q, type],
    queryFn: () => fn({ data: { q, post_type: type, limit: 100 } }),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Ship deleted");
      qc.invalidateQueries({ queryKey: ["admin", "ships"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Ships</h1>
        <p className="text-sm text-muted-foreground">All posts across the platform.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search body text…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-1">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-md px-2.5 py-1 text-xs ${
                type === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (data ?? []).length === 0 ? (
          <div className="rounded-lg border border-border/70 p-4 text-sm text-muted-foreground">No ships</div>
        ) : (
          (data ?? []).map((s: any) => (
            <div key={s.id} className="rounded-lg border border-border/70 bg-card p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {s.author ? (
                    <Link to="/admin/users/$id" params={{ id: s.author.id }} className="flex items-center gap-1.5 hover:text-foreground">
                      <UserAvatar url={s.author.avatar_url} name={s.author.display_name} size={20} />
                      <span className="font-mono">@{s.author.username ?? "…"}</span>
                    </Link>
                  ) : null}
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono">{s.post_type}</span>
                  {s.tool_tag ? <span className="font-mono">{s.tool_tag}</span> : null}
                  <span>{formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</span>
                </div>
                <button
                  onClick={() => confirm("Delete this ship?") && del.mutate(s.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm">{s.body}</p>
              {s.link_url ? (
                <a href={s.link_url} target="_blank" rel="noopener noreferrer" className="mt-1 block font-mono text-xs text-primary hover:underline">
                  {s.link_url}
                </a>
              ) : null}
              {(s.topic_tags ?? []).length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.topic_tags.map((t: string) => (
                    <span key={t} className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px]">{t}</span>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}