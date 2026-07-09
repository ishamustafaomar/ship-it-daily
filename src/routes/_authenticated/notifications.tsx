import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Repeat2, MessageCircle, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RightRail } from "@/components/RightRail";
import { UserAvatar } from "@/components/UserAvatar";
import { getNotifications, markAllRead } from "@/lib/api.functions";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotifPage,
});

const ICONS = { like: Heart, reship: Repeat2, reply: MessageCircle, follow: UserPlus } as const;
const VERBS = { like: "liked your ship", reship: "reshipped your ship", reply: "replied to your ship", follow: "started following you" };

function NotifPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(getNotifications);
  const readFn = useServerFn(markAllRead);
  const { data } = useQuery({ queryKey: ["notifications"], queryFn: () => listFn() });

  useEffect(() => {
    readFn().then(() => qc.invalidateQueries({ queryKey: ["unread"] }));
  }, [readFn, qc]);

  return (
    <AppShell right={<RightRail />}>
      <header className="border-b border-border/70 px-4 py-4">
        <h1 className="text-xl font-semibold">Notifications</h1>
      </header>
      {(data ?? []).length === 0 ? (
        <p className="p-10 text-center text-sm text-muted-foreground">Nothing here yet.</p>
      ) : null}
      {(data ?? []).map((n: any) => {
        const Icon = ICONS[n.type as keyof typeof ICONS] ?? Heart;
        const actor = n.actor;
        const username = actor?.username ?? "someone";
        return (
          <div
            key={n.id}
            className={`flex items-start gap-3 border-b border-border/70 px-4 py-3 ${
              !n.read ? "bg-secondary/30" : ""
            }`}
          >
            <Icon className="mt-1 h-4 w-4 text-primary" />
            <UserAvatar url={actor?.avatar_url} name={actor?.display_name ?? username} size={36} />
            <div className="min-w-0 flex-1 text-sm">
              <p>
                <Link
                  to="/u/$username"
                  params={{ username }}
                  className="font-medium hover:underline"
                >
                  {actor?.display_name ?? username}
                </Link>{" "}
                <span className="text-muted-foreground">{VERBS[n.type as keyof typeof VERBS]}</span>
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
              {n.ship_id ? (
                <Link
                  to="/s/$shipId"
                  params={{ shipId: n.ship_id }}
                  className="mt-1 inline-block text-xs text-primary hover:underline"
                >
                  View ship →
                </Link>
              ) : null}
            </div>
          </div>
        );
      })}
    </AppShell>
  );
}