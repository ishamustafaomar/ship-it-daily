import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAdminUsers } from "@/lib/admin.functions";
import { UserAvatar } from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_admin/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"created_at" | "streak_count" | "ship_count">("created_at");
  const fn = useServerFn(listAdminUsers);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", q, sort],
    queryFn: () => fn({ data: { q, sort, limit: 100 } }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">All signed-up builders.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search username or display name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-1">
          {(["created_at", "streak_count", "ship_count"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-md px-2.5 py-1 text-xs ${
                sort === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {s === "created_at" ? "Newest" : s === "streak_count" ? "Streak" : "Ships"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/70">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-right">Ships</th>
              <th className="px-3 py-2 text-right">Streak</th>
              <th className="px-3 py-2 text-right">Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : (data ?? []).length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No users</td></tr>
            ) : (
              (data ?? []).map((u) => (
                <tr key={u.id} className="border-t border-border/50 hover:bg-secondary/30">
                  <td className="px-3 py-2">
                    <Link to="/admin/users/$id" params={{ id: u.id }} className="flex items-center gap-2">
                      <UserAvatar url={u.avatar_url} name={u.display_name} size={28} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{u.display_name ?? "—"}</div>
                        <div className="truncate font-mono text-xs text-muted-foreground">@{u.username ?? "…"}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono">{u.ship_count}</td>
                  <td className="px-3 py-2 text-right font-mono">{u.streak_count}</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                    {u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true }) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}