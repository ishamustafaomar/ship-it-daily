import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Repeat2, Link as LinkIcon, MoreHorizontal, Trash2, SmilePlus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import type { FeedShip } from "@/lib/api.functions";
import { deleteShip, toggleLike, toggleReship, toggleReaction, REACTION_EMOJIS } from "@/lib/api.functions";
import { UserAvatar } from "./UserAvatar";
import { ToolTag } from "./ToolTag";
import { timeAgo } from "@/lib/format";
import { useSession } from "@/hooks/use-session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function nf(n: number) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

export function ShipCard({
  ship,
  myUserId,
  compact = false,
  onReply,
}: {
  ship: FeedShip;
  myUserId: string | null;
  compact?: boolean;
  onReply?: (ship: FeedShip) => void;
}) {
  const qc = useQueryClient();
  const like = useServerFn(toggleLike);
  const reship = useServerFn(toggleReship);
  const del = useServerFn(deleteShip);
  const react = useServerFn(toggleReaction);
  const { session } = useSession();
  const signedIn = !!session;

  const patch = (fn: (s: FeedShip) => FeedShip) => {
    qc.setQueriesData({ queryKey: ["feed"] }, (data: any) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages?.map((p: any) => ({
          ...p,
          items: p.items.map((it: FeedShip) => (it.id === ship.id ? fn(it) : it)),
        })),
      };
    });
    qc.setQueriesData({ queryKey: ["ship", ship.id] }, (d: any) =>
      d ? { ...d, ship: fn(d.ship) } : d,
    );
  };

  const likeM = useMutation({
    mutationFn: async (next: boolean) => like({ data: { shipId: ship.id, liked: next } }),
    onMutate: (next) => {
      patch((s) => ({
        ...s,
        liked_by_me: next,
        like_count: s.like_count + (next ? 1 : -1),
      }));
    },
    onError: () => {
      patch((s) => ({
        ...s,
        liked_by_me: !s.liked_by_me,
        like_count: s.like_count + (s.liked_by_me ? -1 : 1),
      }));
      toast.error("Could not update like");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });

  const reshipM = useMutation({
    mutationFn: async (next: boolean) => reship({ data: { shipId: ship.id, reshipped: next } }),
    onMutate: (next) => {
      patch((s) => ({
        ...s,
        reshipped_by_me: next,
        reship_count: s.reship_count + (next ? 1 : -1),
      }));
    },
    onError: () => {
      patch((s) => ({
        ...s,
        reshipped_by_me: !s.reshipped_by_me,
        reship_count: s.reship_count + (s.reshipped_by_me ? -1 : 1),
      }));
      toast.error("Could not reship");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });

  const reactM = useMutation({
    mutationFn: async (vars: { emoji: string; active: boolean }) =>
      react({ data: { shipId: ship.id, emoji: vars.emoji as any, active: vars.active } }),
    onMutate: ({ emoji, active }) => {
      patch((s) => {
        const existing = s.reactions.find((r) => r.emoji === emoji);
        let next = s.reactions.slice();
        if (existing) {
          const count = existing.count + (active ? 1 : -1);
          if (count <= 0) next = next.filter((r) => r.emoji !== emoji);
          else next = next.map((r) => (r.emoji === emoji ? { ...r, count, mine: active } : r));
        } else if (active) {
          next.push({ emoji, count: 1, mine: true });
        }
        return { ...s, reactions: next.sort((a, b) => b.count - a.count) };
      });
    },
    onError: () => {
      toast.error("Could not update reaction");
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });

  const delM = useMutation({
    mutationFn: async () => del({ data: { shipId: ship.id } }),
    onSuccess: () => {
      toast.success("Ship deleted");
      qc.invalidateQueries();
    },
    onError: () => toast.error("Delete failed"),
  });

  const isMine = myUserId === ship.author_id;
  const author = ship.author;
  const username = author.username ?? "anon";

  return (
    <article className="border-b border-border px-4 py-4 hover:bg-secondary/20 transition-colors">
      <div className="flex gap-3">
        <Link to="/u/$username" params={{ username }} className="shrink-0">
          <UserAvatar url={author.avatar_url} name={author.display_name ?? username} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm">
            <Link
              to="/u/$username"
              params={{ username }}
              className="font-semibold text-foreground hover:underline truncate"
            >
              {author.display_name ?? username}
            </Link>
            <span className="text-muted-foreground truncate">@{username}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-xs text-muted-foreground shrink-0">
              {timeAgo(ship.created_at)}
            </span>
            {ship.post_type && ship.post_type !== "ship" ? (
              <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-primary">
                {ship.post_type}
              </span>
            ) : null}
            {ship.tool_tag ? (
              <span className="ml-1">
                <ToolTag tag={ship.tool_tag} />
              </span>
            ) : null}
            <div className="ml-auto">
              {isMine ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => delM.mutate()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>

          <Link
            to="/s/$shipId"
            params={{ shipId: ship.id }}
            className="block"
          >
            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-snug text-foreground">
              {ship.body}
            </p>
            {ship.link_url ? (
              <a
                href={ship.link_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate rounded-md border border-border bg-secondary/50 px-2 py-1 font-mono text-xs text-primary hover:bg-secondary"
              >
                <LinkIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">{ship.link_url.replace(/^https?:\/\//, "")}</span>
              </a>
            ) : null}
            {ship.image_signed_url ? (
              <div className="mt-2 overflow-hidden rounded-lg border border-border">
                <img src={ship.image_signed_url} alt="" className="max-h-[420px] w-full object-cover" />
              </div>
            ) : null}
          </Link>

          {ship.topic_tags && ship.topic_tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ship.topic_tags.map((t) => (
                <Link
                  key={t}
                  to="/home"
                  search={{ tab: "for_you", tag: t, tool: "" }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary hover:bg-primary/20"
                >
                  #{t}
                </Link>
              ))}
            </div>
          ) : null}

          {!compact ? (
            <>
            {ship.reactions.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ship.reactions.map((r) => (
                  signedIn ? (
                  <button
                    key={r.emoji}
                    onClick={() => reactM.mutate({ emoji: r.emoji, active: !r.mine })}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors min-h-[28px] ${
                      r.mine
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border bg-secondary/40 text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span className="font-mono">{r.count}</span>
                  </button>
                  ) : (
                    <span
                      key={r.emoji}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-xs text-foreground min-h-[28px]"
                    >
                      <span>{r.emoji}</span>
                      <span className="font-mono">{r.count}</span>
                    </span>
                  )
                ))}
              </div>
            ) : null}
            {signedIn ? (
            <div className="mt-3 flex items-center gap-6 text-muted-foreground">
              <button
                onClick={() => onReply?.(ship)}
                className="inline-flex items-center gap-1.5 text-xs hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="font-mono">{nf(ship.reply_count)}</span>
              </button>
              <button
                onClick={() => reshipM.mutate(!ship.reshipped_by_me)}
                className={`inline-flex items-center gap-1.5 text-xs hover:text-primary ${
                  ship.reshipped_by_me ? "text-primary" : ""
                }`}
              >
                <Repeat2 className="h-4 w-4" />
                <span className="font-mono">{nf(ship.reship_count)}</span>
              </button>
              <button
                onClick={() => likeM.mutate(!ship.liked_by_me)}
                className={`inline-flex items-center gap-1.5 text-xs hover:text-primary ${
                  ship.liked_by_me ? "text-primary" : ""
                }`}
              >
                <Heart className={`h-4 w-4 ${ship.liked_by_me ? "fill-current" : ""}`} />
                <span className="font-mono">{nf(ship.like_count)}</span>
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    aria-label="Add reaction"
                    className="inline-flex items-center gap-1.5 text-xs hover:text-primary"
                  >
                    <SmilePlus className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-1">
                  <div className="flex gap-1">
                    {REACTION_EMOJIS.map((e) => {
                      const mine = ship.reactions.find((r) => r.emoji === e)?.mine ?? false;
                      return (
                        <button
                          key={e}
                          onClick={() => reactM.mutate({ emoji: e, active: !mine })}
                          className={`h-9 w-9 rounded-md text-lg hover:bg-secondary ${
                            mine ? "bg-primary/15" : ""
                          }`}
                        >
                          {e}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            ) : (
              <div className="mt-3 flex items-center gap-6 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <MessageCircle className="h-4 w-4" />
                  <span className="font-mono">{nf(ship.reply_count)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <Repeat2 className="h-4 w-4" />
                  <span className="font-mono">{nf(ship.reship_count)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <Heart className="h-4 w-4" />
                  <span className="font-mono">{nf(ship.like_count)}</span>
                </span>
                <Link
                  to="/auth"
                  className="ml-auto font-mono text-[11px] text-primary hover:underline"
                >
                  Sign in to react
                </Link>
              </div>
            )}
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}