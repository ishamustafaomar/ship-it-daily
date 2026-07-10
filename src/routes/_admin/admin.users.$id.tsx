import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminUser, adminDeleteShip, adminDeleteUser } from "@/lib/admin.functions";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Trash2, ArrowLeft, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/users/$id")({
  component: AdminUserDetail,
});

function AdminUserDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getAdminUser);
  const delShipFn = useServerFn(adminDeleteShip);
  const delUserFn = useServerFn(adminDeleteUser);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const delShip = useMutation({
    mutationFn: (shipId: string) => delShipFn({ data: { id: shipId } }),
    onSuccess: () => {
      toast.success("Ship deleted");
      qc.invalidateQueries({ queryKey: ["admin", "user", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const delUser = useMutation({
    mutationFn: () => delUserFn({ data: { id } }),
    onSuccess: () => {
      toast.success("User deleted");
      navigate({ to: "/admin/users" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (isLoading || !data) return <div className="text-muted-foreground">Loading…</div>;
  const p = data.profile;
  if (!p) return <div className="text-muted-foreground">User not found</div>;

  return (
    <div className="space-y-6">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All users
      </Link>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-card p-4">
        <div className="flex gap-4">
          <UserAvatar url={p.avatar_url} name={p.display_name} size={64} />
          <div>
            <div className="text-xl font-semibold">{p.display_name ?? "—"}</div>
            <div className="font-mono text-sm text-muted-foreground">@{p.username ?? "…"}</div>
            <div className="font-mono text-xs text-muted-foreground">{data.email ?? "—"}</div>
            {p.bio ? <p className="mt-2 max-w-xl text-sm">{p.bio}</p> : null}
            <div className="mt-2 flex flex-wrap gap-1">
              {(p.focus_tags ?? []).map((t: string) => (
                <span key={t} className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-right text-xs text-muted-foreground">
          <div><span className="font-mono text-foreground">{p.streak_count}</span> streak · <span className="font-mono text-foreground">{p.longest_streak}</span> best</div>
          <div><span className="font-mono text-foreground">{data.followers}</span> followers · <span className="font-mono text-foreground">{data.following}</span> following</div>
          {data.last_sign_in_at ? (
            <div>Last sign-in {formatDistanceToNow(new Date(data.last_sign_in_at), { addSuffix: true })}</div>
          ) : null}
          <div className="mt-2 flex gap-2">
            {p.username ? (
              <Button size="sm" variant="outline" asChild>
                <Link to="/u/$username" params={{ username: p.username }}>
                  <ExternalLink className="mr-1 h-3 w-3" /> Public profile
                </Link>
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm("Permanently delete this user and all their data?")) delUser.mutate();
              }}
              disabled={delUser.isPending}
            >
              Delete user
            </Button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Ships ({data.ships.length})
        </h2>
        <div className="space-y-2">
          {data.ships.length === 0 ? (
            <div className="rounded-lg border border-border/70 p-4 text-sm text-muted-foreground">No ships yet.</div>
          ) : (
            data.ships.map((s: any) => (
              <div key={s.id} className="rounded-lg border border-border/70 bg-card p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono">{s.post_type}</span>
                    {s.tool_tag ? <span className="font-mono">{s.tool_tag}</span> : null}
                    <span>{formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</span>
                  </div>
                  <button
                    onClick={() => confirm("Delete this ship?") && delShip.mutate(s.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete ship"
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}