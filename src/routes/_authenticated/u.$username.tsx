import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Flame, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RightRail } from "@/components/RightRail";
import { ShipCard } from "@/components/ShipCard";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/TagInput";
import { getProfileByUsername, toggleFollow, updateMyProfile } from "@/lib/api.functions";

export const Route = createFileRoute("/_authenticated/u/$username")({
  component: ProfilePage,
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — ShippedIn` },
      { name: "description", content: `Ships, streak, and updates from @${params.username} on ShippedIn — a daily feed for builders shipping with AI tools.` },
      { property: "og:title", content: `@${params.username} on ShippedIn` },
      { property: "og:description", content: `Follow @${params.username}'s daily ships and streak on ShippedIn.` },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: `https://shippedin.dev/u/${params.username}` },
    ],
    links: [{ rel: "canonical", href: `https://shippedin.dev/u/${params.username}` }],
  }),
});

function ProfilePage() {
  const { username } = useParams({ from: "/_authenticated/u/$username" });
  const qc = useQueryClient();
  const fetchFn = useServerFn(getProfileByUsername);
  const followFn = useServerFn(toggleFollow);
  const { data, isLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => fetchFn({ data: { username } }),
  });

  const follow = useMutation({
    mutationFn: async (next: boolean) =>
      followFn({ data: { profileId: data!.profile.id, following: next } }),
    onMutate: (next) => {
      qc.setQueryData(["profile", username], (old: any) =>
        old
          ? {
              ...old,
              is_following: next,
              followers: old.followers + (next ? 1 : -1),
            }
          : old,
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["profile", username] }),
  });

  return (
    <AppShell right={<RightRail />}>
      {isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <p className="p-10 text-center text-sm text-muted-foreground">Profile not found.</p>
      ) : (
        <>
          <header className="border-b border-border/70 p-4">
            <div className="flex items-start gap-4">
              <UserAvatar url={data.profile.avatar_url} name={data.profile.display_name} size={72} />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold">{data.profile.display_name ?? data.profile.username}</h1>
                <p className="font-mono text-sm text-muted-foreground">@{data.profile.username}</p>
                {data.profile.building_now ? (
                  <p className="mt-2 rounded-md border border-border/60 bg-secondary/40 px-2 py-1 font-mono text-xs text-muted-foreground">
                    building: <span className="text-foreground">{data.profile.building_now}</span>
                  </p>
                ) : null}
                {data.profile.bio ? (
                  <p className="mt-2 text-sm text-foreground">{data.profile.bio}</p>
                ) : null}
                <FocusTagsSection
                  isMe={data.is_me}
                  tags={(data.profile.focus_tags ?? []) as string[]}
                  onSaved={() => qc.invalidateQueries({ queryKey: ["profile", username] })}
                />
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1">
                    <Flame className={`h-4 w-4 ${data.profile.streak_count ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-mono">{data.profile.streak_count}</span>
                    <span className="text-muted-foreground">day streak</span>
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-mono text-foreground">{data.followers}</span> followers
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-mono text-foreground">{data.following}</span> following
                  </span>
                </div>
              </div>
              {!data.is_me ? (
                <Button
                  variant={data.is_following ? "secondary" : "default"}
                  onClick={() => follow.mutate(!data.is_following)}
                  size="sm"
                >
                  {data.is_following ? "Following" : "Follow"}
                </Button>
              ) : null}
            </div>
          </header>

          <div>
            {data.ships.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">No ships yet.</p>
            ) : (
              data.ships.map((s) => (
                <ShipCard key={s.id} ship={s} myUserId={data.is_me ? data.profile.id : null} />
              ))
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}