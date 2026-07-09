import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RightRail } from "@/components/RightRail";
import { ShipCard } from "@/components/ShipCard";
import { Composer } from "@/components/Composer";
import { getMyProfile, getShipDetail } from "@/lib/api.functions";

export const Route = createFileRoute("/_authenticated/s/$shipId")({
  component: ShipDetail,
});

function ShipDetail() {
  const { shipId } = useParams({ from: "/_authenticated/s/$shipId" });
  const navigate = useNavigate();
  const meFn = useServerFn(getMyProfile);
  const fetchFn = useServerFn(getShipDetail);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const { data, isLoading } = useQuery({
    queryKey: ["ship", shipId],
    queryFn: () => fetchFn({ data: { shipId } }),
  });

  return (
    <AppShell right={<RightRail />}>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/home" })}
          className="rounded-full p-1 hover:bg-secondary"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-base font-semibold">Ship</h1>
      </header>
      {isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.ship ? (
        <p className="p-10 text-center text-sm text-muted-foreground">Ship not found.</p>
      ) : (
        <>
          <ShipCard ship={data.ship} myUserId={me?.id ?? null} />
          {me?.id && me.username ? (
            <div className="border-b border-border/70">
              <Composer
                myUserId={me.id}
                avatarUrl={me.avatar_url}
                parentShipId={data.ship.id}
                placeholder="Post your reply"
              />
            </div>
          ) : null}
          {data.replies.map((r) => (
            <ShipCard key={r.id} ship={r} myUserId={me?.id ?? null} />
          ))}
          {data.replies.length === 0 ? (
            <p className="p-10 text-center text-xs text-muted-foreground">Be the first to reply.</p>
          ) : null}
        </>
      )}
    </AppShell>
  );
}