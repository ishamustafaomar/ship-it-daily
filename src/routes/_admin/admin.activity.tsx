import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminActivity } from "@/lib/admin.functions";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import { UserPlus, MessageSquare, Heart, Users } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/activity")({
  component: AdminActivity,
});

function AdminActivity() {
  const fn = useServerFn(getAdminActivity);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "activity"],
    queryFn: () => fn(),
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-sm text-muted-foreground">Live-ish stream of what's happening.</p>
      </div>

      <div className="space-y-1.5">
        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (data ?? []).length === 0 ? (
          <div className="text-muted-foreground">Nothing yet.</div>
        ) : (
          (data ?? []).map((item, i) => <Row key={i} item={item} />)
        )}
      </div>
    </div>
  );
}

function Row({ item }: { item: any }) {
  const ago = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });

  if (item.kind === "signup") {
    const p = item.data.profile;
    return (
      <div className="flex items-center gap-3 rounded-md border border-border/50 bg-card p-2.5 text-sm">
        <UserPlus className="h-4 w-4 text-primary" />
        <UserAvatar url={p.avatar_url} name={p.display_name} size={24} />
        <Link to="/admin/users/$id" params={{ id: p.id }} className="flex-1 truncate hover:underline">
          <span className="font-medium">{p.display_name ?? "New user"}</span>{" "}
          <span className="font-mono text-xs text-muted-foreground">@{p.username ?? "…"}</span> joined
        </Link>
        <span className="text-xs text-muted-foreground">{ago}</span>
      </div>
    );
  }
  if (item.kind === "ship") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-border/50 bg-card p-2.5 text-sm">
        <MessageSquare className="mt-0.5 h-4 w-4 text-primary" />
        {item.data.author ? (
          <UserAvatar url={item.data.author.avatar_url} name={item.data.author.display_name} size={24} />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">
            {item.data.author ? (
              <Link to="/admin/users/$id" params={{ id: item.data.author.id }} className="font-mono hover:underline">
                @{item.data.author.username ?? "…"}
              </Link>
            ) : null}{" "}
            posted a {item.data.post_type}
          </div>
          <div className="truncate">{item.data.body}</div>
        </div>
        <span className="whitespace-nowrap text-xs text-muted-foreground">{ago}</span>
      </div>
    );
  }
  if (item.kind === "follow") {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border/50 bg-card p-2.5 text-sm">
        <Users className="h-4 w-4 text-primary" />
        <div className="min-w-0 flex-1 truncate">
          <span className="font-mono">@{item.data.follower?.username ?? "…"}</span>{" "}
          followed <span className="font-mono">@{item.data.following?.username ?? "…"}</span>
        </div>
        <span className="text-xs text-muted-foreground">{ago}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-md border border-border/50 bg-card p-2.5 text-sm">
      <Heart className="h-4 w-4 text-primary" />
      <div className="min-w-0 flex-1 truncate">
        <span className="font-mono">@{item.data.user?.username ?? "…"}</span> liked a ship
      </div>
      <span className="text-xs text-muted-foreground">{ago}</span>
    </div>
  );
}