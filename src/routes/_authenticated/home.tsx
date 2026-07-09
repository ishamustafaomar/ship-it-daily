import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RightRail } from "@/components/RightRail";
import { Composer } from "@/components/Composer";
import { ShipCard } from "@/components/ShipCard";
import { getFeed, getMyProfile } from "@/lib/api.functions";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"following" | "for_you">("for_you");
  const meFn = useServerFn(getMyProfile);
  const feedFn = useServerFn(getFeed);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });

  useEffect(() => {
    if (me && !me.username) navigate({ to: "/onboarding" });
  }, [me, navigate]);

  const feed = useInfiniteQuery({
    queryKey: ["feed", tab],
    queryFn: ({ pageParam }) =>
      feedFn({ data: { tab, cursor: pageParam as string | null } }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!me?.username,
  });

  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <AppShell right={<RightRail />}>
      <div className="border-b border-border/70">
        <div className="flex">
          {(["following", "for_you"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative flex-1 py-3.5 text-sm font-medium transition-colors ${
                tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "following" ? "Following" : "For You"}
              {tab === t ? (
                <span className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-16 rounded-full bg-primary" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {me?.username ? (
        <div className="border-b border-border/70">
          <Composer myUserId={me.id} avatarUrl={me.avatar_url} />
        </div>
      ) : null}

      {feed.isLoading ? (
        <div className="flex items-center justify-center p-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <>
          {items.map((s) => (
            <ShipCard key={s.id} ship={s} myUserId={me?.id ?? null} />
          ))}
          {feed.hasNextPage ? (
            <div className="flex justify-center p-6">
              <button
                onClick={() => feed.fetchNextPage()}
                disabled={feed.isFetchingNextPage}
                className="rounded-md border border-border px-4 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
              >
                {feed.isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : (
            <div className="p-6 text-center font-mono text-xs text-muted-foreground">
              — end of feed —
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

function EmptyState({ tab }: { tab: "following" | "for_you" }) {
  return (
    <div className="p-10 text-center">
      <p className="text-sm text-muted-foreground">
        {tab === "following"
          ? "Follow some builders and their ships show up here."
          : "No ships yet. Be the first to post!"}
      </p>
    </div>
  );
}