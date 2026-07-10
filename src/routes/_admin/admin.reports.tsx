import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminReports, resolveAdminReport } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const qc = useQueryClient();
  const fn = useServerFn(listAdminReports);
  const resolveFn = useServerFn(resolveAdminReport);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: () => fn(),
  });
  const resolve = useMutation({
    mutationFn: (id: string) => resolveFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Marked resolved");
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Ships flagged by users.</p>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (data ?? []).length === 0 ? (
          <div className="rounded-lg border border-border/70 p-6 text-center text-sm text-muted-foreground">
            No reports. When users flag ships, they'll appear here.
          </div>
        ) : (
          (data ?? []).map((r: any) => (
            <div key={r.id} className="rounded-lg border border-border/70 bg-card p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono ${
                      r.status === "open" ? "bg-primary/20 text-primary" : "bg-secondary"
                    }`}
                  >
                    {r.status}
                  </span>
                  <span>
                    reported by <span className="font-mono">@{r.reporter?.username ?? "…"}</span>
                  </span>
                  <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                </div>
                {r.status === "open" ? (
                  <Button size="sm" variant="outline" onClick={() => resolve.mutate(r.id)}>
                    Resolve
                  </Button>
                ) : null}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Reason:</span> {r.reason}
              </div>
              {r.ship ? (
                <div className="mt-2 rounded-md border border-border/50 bg-background/50 p-2 text-sm">
                  {r.ship.body}
                </div>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">Ship deleted</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}