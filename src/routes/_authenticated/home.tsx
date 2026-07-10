import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, X } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RightRail } from "@/components/RightRail";
import { Composer } from "@/components/Composer";
import { ShipCard } from "@/components/ShipCard";
import { TagInput } from "@/components/TagInput";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  getFeed,
  getMyProfile,
  getRightRail,
  toggleFollow,
  updateMyProfile,
} from "@/lib/api.functions";

const searchSchema = z.object({
  tab: fallback(z.enum(["following", "for_you", "relevant"]), "for_you").default("for_you"),
  tag: fallback(z.string(), "").default(""),
  tool: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Home feed — ShippedIn" },
      { name: "description", content: "Your daily ShippedIn feed. See what builders you follow shipped today and post your own update." },
      { property: "og:title", content: "Home feed — ShippedIn" },
      { property: "og:description", content: "Your following and For You feed of daily builder ships." },
      { property: "og:url", content: "https://shippedin.dev/home" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://shippedin.dev/home" }],
  }),
});

function HomePage() {
  const navigate = useNavigate();
  const { tab, tag, tool } = Route.useSearch();
  const activeTag = tag.trim();
  const activeTool = tool.trim();
  const activeTab = activeTag || activeTool ? "for_you" : tab;
  const meFn = useServerFn(getMyProfile);
  const feedFn = useServerFn(getFeed);
  const { data: me, isFetching: meFetching } = useQuery({
    queryKey: ["me"],
    queryFn: () => meFn(),
  });

  useEffect(() => {
    // Only redirect once we have fresh data — avoids a bounce when the cache
    // is stale right after onboarding save.
    if (me && !me.username && !meFetching) navigate({ to: "/onboarding" });
  }, [me, meFetching, navigate]);

  const feed = useInfiniteQuery({
    queryKey: ["feed", activeTab, activeTag, activeTool],
    queryFn: ({ pageParam }) =>
      feedFn({
        data: {
          tab: activeTab,
          cursor: pageParam as string | null,
          tag: activeTag || null,
          tool: activeTool || null,
        },
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!me?.username,
  });

  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const needsFocus = feed.data?.pages[0]?.needsFocus ?? false;

  return (
    <AppShell right={<RightRail />}>
      <div className="border-b border-border/70">
        <div className="flex">
          {(["following", "for_you", "relevant"] as const).map((t) => (
            <button
              key={t}
              onClick={() => navigate({ to: "/home", search: { tab: t, tag: "", tool: "" } })}
              className={`relative flex-1 py-3.5 text-sm font-medium transition-colors ${
                !activeTag && !activeTool && tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "following" ? "Following" : t === "for_you" ? "For You" : "Relevant"}
              {!activeTag && !activeTool && tab === t ? (
                <span className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-16 rounded-full bg-primary" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {activeTag || activeTool ? (
        <div className="flex items-center justify-between border-b border-border/70 bg-secondary/30 px-4 py-2">
          <span className="font-mono text-sm text-foreground">
            filtering by{" "}
            <span className="text-primary">
              {activeTag ? `#${activeTag}` : `[ ${activeTool} ]`}
            </span>
          </span>
          <button
            onClick={() => navigate({ to: "/home", search: { tab, tag: "", tool: "" } })}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3 w-3" /> clear
          </button>
        </div>
      ) : null}

      {me?.username ? (
        <div className="border-b border-border/70">
          <Composer myUserId={me.id} avatarUrl={me.avatar_url} />
        </div>
      ) : null}

      {feed.isLoading ? (
        <div className="flex items-center justify-center p-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : needsFocus ? (
        <FocusPrompt />
      ) : items.length === 0 ? (
        activeTab === "following" && !activeTag && !activeTool ? (
          <FollowingEmpty />
        ) : (
          <EmptyState tab={activeTab} tag={activeTag} tool={activeTool} />
        )
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

function EmptyState({
  tab,
  tag,
  tool,
}: {
  tab: "following" | "for_you" | "relevant";
  tag: string;
  tool: string;
}) {
  return (
    <div className="p-10 text-center">
      <p className="text-sm text-muted-foreground">
        {tag
          ? `No ships tagged #${tag} yet.`
          : tool
          ? `No ships built with [ ${tool} ] yet.`
          : tab === "following"
          ? "Follow some builders and their ships show up here."
          : tab === "relevant"
          ? "No recent ships match your focus tags. Try broader tags or check back later."
          : "No ships yet. Be the first to post!"}
      </p>
    </div>
  );
}

function FollowingEmpty() {
  const qc = useQueryClient();
  const fn = useServerFn(getRightRail);
  const followFn = useServerFn(toggleFollow);
  const { data } = useQuery({ queryKey: ["rightRail"], queryFn: () => fn() });
  const follow = useMutation({
    mutationFn: async (profileId: string) =>
      followFn({ data: { profileId, following: true } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rightRail"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
  const suggestions = (data?.suggestions ?? []).slice(0, 5);
  return (
    <div className="p-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">
          Your Following feed is empty
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Follow a few builders to fill it up. Here are some active shippers:
        </p>
        {suggestions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No suggestions yet — check back soon.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {suggestions.map((p: any) => (
              <li key={p.id} className="flex items-center gap-3">
                <Link to="/u/$username" params={{ username: p.username ?? "" }}>
                  <UserAvatar url={p.avatar_url} name={p.display_name ?? p.username} size={40} />
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
                    {p.building_now ? ` · ${p.building_now}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  onClick={() => follow.mutate(p.id)}
                  disabled={follow.isPending}
                >
                  Follow
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FocusPrompt() {
  const qc = useQueryClient();
  const saveFn = useServerFn(updateMyProfile);
  const [tags, setTags] = useState<string[]>([]);
  const save = useMutation({
    mutationFn: async () => saveFn({ data: { focus_tags: tags } }),
    onSuccess: () => {
      toast.success("Focus updated");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  return (
    <div className="p-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">
          Tell us what you're working on
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add up to 5 tags for what you're building or stuck on. We'll surface ships from
          other builders who touched the same problems.
        </p>
        <div className="mt-3">
          <TagInput
            value={tags}
            onChange={setTags}
            max={5}
            placeholder="auth, stripe-payments, onboarding…"
          />
        </div>
        <button
          disabled={tags.length === 0 || save.isPending}
          onClick={() => save.mutate()}
          className="mt-3 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save focus tags"}
        </button>
      </div>
    </div>
  );
}