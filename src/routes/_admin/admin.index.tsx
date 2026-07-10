import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/lib/admin.functions";
import { Users, MessageSquare, Heart, UserPlus, Flame, Flag } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const fn = useServerFn(getAdminStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "stats"], queryFn: () => fn() });

  if (isLoading || !data) return <div className="text-muted-foreground">Loading…</div>;

  const t = data.totals;
  const maxSignup = Math.max(1, ...data.signups.map((r) => r.count));
  const maxShip = Math.max(1, ...data.shipsSeries.map((r) => r.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Snapshot of activity on ShippedIn.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Users" value={t.users} sub={`+${t.users24} today · +${t.users7} 7d`} icon={Users} />
        <Stat label="Ships" value={t.ships} sub={`+${t.shipsToday} today`} icon={MessageSquare} />
        <Stat label="Active streaks" value={t.activeStreaks} sub={`(streak ≥ 2)`} icon={Flame} />
        <Stat label="Likes" value={t.likes} sub={`${t.follows} follows`} icon={Heart} />
        <Stat label="New (30d)" value={t.users30} sub="signups" icon={UserPlus} />
        <Stat label="Open reports" value={t.reports} icon={Flag} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Chart title="Signups (30d)" data={data.signups} max={maxSignup} />
        <Chart title="Ships (30d)" data={data.shipsSeries} max={maxShip} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TagList title="Top tools (7d)" items={data.topTools} />
        <TagList title="Top topic tags (7d)" items={data.topTags} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: any;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value.toLocaleString()}</div>
      {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function Chart({
  title,
  data,
  max,
}: {
  title: string;
  data: { date: string; count: number }[];
  max: number;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-4">
      <div className="mb-3 text-sm font-medium">{title}</div>
      <div className="flex h-32 items-end gap-[2px]">
        {data.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.count}`}
            className="flex-1 rounded-sm bg-primary/70 hover:bg-primary"
            style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function TagList({ title, items }: { title: string; items: { tag: string; count: number }[] }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-4">
      <div className="mb-3 text-sm font-medium">{title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">No data</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li key={i.tag} className="flex items-center justify-between text-sm">
              <span className="font-mono text-muted-foreground">{i.tag}</span>
              <span className="font-mono text-xs">{i.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}