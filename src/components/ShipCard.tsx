import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Repeat2, Link as LinkIcon, MoreHorizontal, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import type { FeedShip } from "@/lib/api.functions";
import { deleteShip, toggleLike, toggleReship } from "@/lib/api.functions";
import { UserAvatar } from "./UserAvatar";
import { ToolTag } from "./ToolTag";
import { timeAgo } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
                  search={{ tag: t }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary hover:bg-primary/20"
                >
                  #{t}
                </Link>
              ))}
            </div>
          ) : null}

          {!compact ? (
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
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}