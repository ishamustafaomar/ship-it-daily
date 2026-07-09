import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Flame, TrendingUp } from "lucide-react";
import { getRightRail, toggleFollow } from "@/lib/api.functions";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";

export function RightRail() {
  const qc = useQueryClient();
  const fn = useServerFn(getRightRail);
  const followFn = useServerFn(toggleFollow);
  const { data } = useQuery({ queryKey: ["rightRail"], queryFn: () => fn() });

  const follow = useMutation({
    mutationFn: async (profileId: string) =>
      followFn({ data: { profileId, following: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rightRail"] }),
  });

  const streak = data?.me?.streak_count ?? 0;
  const longest = data?.me?.longest_streak ?? 0;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">Your streak</h3>
          <Flame className={`h-4 w-4 ${streak > 0 ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-4xl font-semibold text-foreground">{streak}</span>
          <span className="text-sm text-muted-foreground">day{streak === 1 ? "" : "s"}</span>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          longest: {longest} · ship today to keep it alive
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Builders to follow</h3>
        <div className="space-y-3">
          {(data?.suggestions ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Nobody new right now — check back soon.</p>
          ) : null}
          {(data?.suggestions ?? []).map((p: any) => (
            <div key={p.id} className="flex items-center gap-2">
              <Link to="/u/$username" params={{ username: p.username ?? "" }}>
                <UserAvatar url={p.avatar_url} name={p.display_name ?? p.username} size={36} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  to="/u/$username"
                  params={{ username: p.username ?? "" }}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {p.display_name ?? p.username}
                </Link>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  @{p.username} · {p.streak_count}🔥
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 px-3 text-xs"
                onClick={() => follow.mutate(p.id)}
                disabled={follow.isPending}
              >
                Follow
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-muted-foreground">Trending tools</h3>
        </div>
        <div className="space-y-2">
          {(data?.trending ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No trending tools yet this week.</p>
          ) : null}
          {(data?.trending ?? []).map((t: any) => (
            <div key={t.tag} className="flex items-center justify-between font-mono text-sm">
              <span className="text-foreground">[ {t.tag} ]</span>
              <span className="text-muted-foreground">{t.count} ships</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}