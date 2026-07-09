import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RightRail } from "@/components/RightRail";
import { ShipCard } from "@/components/ShipCard";
import { getFeed, getMyProfile } from "@/lib/api.functions";

export const Route = createFileRoute("/_authenticated/explore")({
  component: ExplorePage,
});

function ExplorePage() {
  const meFn = useServerFn(getMyProfile);
  const feedFn = useServerFn(getFeed);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const feed = useInfiniteQuery({
    queryKey: ["feed", "for_you"],
    queryFn: ({ pageParam }) =>
      feedFn({ data: { tab: "for_you", cursor: pageParam as string | null } }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <AppShell right={<RightRail />}>
      <header className="border-b border-border/70 px-4 py-4">
        <h1 className="text-xl font-semibold">Explore</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Latest ships from every builder.</p>
      </header>

      {feed.isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {items.map((s) => (
            <ShipCard key={s.id} ship={s} myUserId={me?.id ?? null} />
          ))}
          {feed.hasNextPage ? (
            <div className="flex justify-center p-6">
              <button
                onClick={() => feed.fetchNextPage()}
                className="rounded-md border border-border px-4 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
              >
                {feed.isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  );
}