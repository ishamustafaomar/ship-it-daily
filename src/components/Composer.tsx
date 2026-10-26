import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Image as ImageIcon, Link as LinkIcon, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { createShip } from "@/lib/api.functions";
import { TOOL_TAGS } from "@/lib/format";
import { UserAvatar } from "./UserAvatar";
import { TagInput } from "./TagInput";
import { useComposerDraft } from "@/hooks/use-composer-draft";
import { hasDraft } from "@/lib/composer-draft";

const NONE = "__none__";

type PostType = "ship" | "ask" | "feedback" | "discussion";
const POST_TYPES: {
  value: PostType;
  label: string;
  placeholder: string;
  cta: string;
}[] = [
  { value: "ship", label: "Shipped", placeholder: "What did you ship today? e.g. 'Added Stripe checkout with Cursor 💳'", cta: "Ship" },
  { value: "ask", label: "Ask", placeholder: "Stuck on something? Ask the community...", cta: "Ask" },
  { value: "feedback", label: "Feedback", placeholder: "Share what you built and ask for feedback...", cta: "Post" },
  { value: "discussion", label: "Discussion", placeholder: "Start a discussion...", cta: "Post" },
];

export function Composer({
  myUserId,
  avatarUrl,
  parentShipId = null,
  placeholder,
  onDone,
  autoFocus,
}: {
  myUserId: string;
  avatarUrl?: string | null;
  parentShipId?: string | null;
  placeholder?: string;
  onDone?: () => void;
  autoFocus?: boolean;
}) {
  const qc = useQueryClient();
  const create = useServerFn(createShip);
  const fileInput = useRef<HTMLInputElement>(null);
  const { draft, update, clear, ready, saved } = useComposerDraft(myUserId, parentShipId);
  const { body, tool, link, imagePath, postType, topicTags } = draft;
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setImagePreview(null);
    if (imagePath) {
      void supabase.storage.from("ship-images").createSignedUrl(imagePath, 3600).then(({ data }) => {
        if (!cancelled) setImagePreview(data?.signedUrl ?? null);
      });
    }
    return () => { cancelled = true; };
  }, [imagePath]);

  const m = useMutation({
    mutationFn: async () =>
      create({
        data: {
          body: body.trim(),
          tool_tag: tool === NONE ? null : tool,
          link_url: link.trim() || null,
          image_url: imagePath,
          parent_ship_id: parentShipId,
          post_type: parentShipId ? undefined : postType,
          topic_tags: parentShipId ? undefined : topicTags,
        },
      }),
    onSuccess: () => {
      clear();
      setImagePreview(null);
      qc.invalidateQueries();
      toast.success(parentShipId ? "Reply posted" : "Posted!");
      onDone?.();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to post"),
  });

  async function handleFile(f: File) {
    if (f.size > 5_000_000) {
      toast.error("Image too large (max 5MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = f.name.split(".").pop() ?? "jpg";
      const path = `${myUserId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("ship-images").upload(path, f, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("ship-images")
        .createSignedUrl(path, 3600);
      update({ imagePath: path });
      setImagePreview(signed?.signedUrl ?? null);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const len = body.length;
  const canPost = ready && body.trim().length > 0 && !m.isPending && !uploading;
  const active = POST_TYPES.find((p) => p.value === postType) ?? POST_TYPES[0];
  const effectivePlaceholder =
    placeholder ?? (parentShipId ? "Write a reply..." : active.placeholder);

  return (
    <div className="flex gap-3 p-4">
      <UserAvatar url={avatarUrl} size={40} />
      <div className="min-w-0 flex-1">
        {!parentShipId ? (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {POST_TYPES.map((t) => (
              <Button
                key={t.value}
                variant="ghost"
                size="sm"
                disabled={!ready || m.isPending}
                type="button"
                onClick={() => update({ postType: t.value })}
                className={`h-auto rounded-full px-3 py-1 font-mono text-xs transition-colors ${
                  postType === t.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </Button>
            ))}
          </div>
        ) : null}

        <Textarea
          autoFocus={autoFocus}
          data-composer="true"
          value={body}
          disabled={!ready || m.isPending}
          onChange={(e) => update({ body: e.target.value })}
          placeholder={effectivePlaceholder}
          rows={parentShipId ? 2 : 3}
          className="resize-none border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0 p-0 shadow-none"
          maxLength={560}
        />

        <div className="mt-2 flex items-center gap-2">
          <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Input
            value={link}
            disabled={!ready || m.isPending}
            onChange={(e) => update({ link: e.target.value })}
            placeholder="https://your-link.com (optional)"
            className="h-8 font-mono text-xs"
          />
        </div>

        {!parentShipId ? (
          <div className="mt-2">
            <TagInput
              value={topicTags}
              onChange={(topicTags) => update({ topicTags })}
              max={3}
              placeholder="topics (optional) — e.g. auth, stripe-payments"
            />
          </div>
        ) : null}

        {imagePreview ? (
          <div className="relative mt-2 overflow-hidden rounded-lg border border-border">
            <img src={imagePreview} alt="" className="max-h-72 w-full object-cover" />
            <button
              onClick={() => {
                update({ imagePath: null });
                setImagePreview(null);
              }}
              className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-foreground hover:bg-background"
              type="button"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {hasDraft(draft) ? (
          <div className="mt-2 flex items-center justify-between gap-2">
            <span role="status" className="text-xs text-muted-foreground">
              {saved ? "Draft saved" : "Draft not saved on this device"}
            </span>
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" disabled={m.isPending || uploading} onClick={() => { clear(); setImagePreview(null); }}>
              <X className="h-3 w-3" /> Discard
            </Button>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select value={tool} onValueChange={(tool) => update({ tool })} disabled={!ready || m.isPending}>
            <SelectTrigger className="h-8 w-36 font-mono text-xs">
              <SelectValue placeholder="tool" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>no tool</SelectItem>
              {TOOL_TAGS.map((t) => (
                <SelectItem key={t} value={t} className="font-mono">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary"
            aria-label="Add image"
            title="Add a screenshot or image (optional)"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
            <span>Add image</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />

          <span
            className={`ml-auto font-mono text-xs ${
              len > 500 ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {len}/560
          </span>
          <Button
            size="sm"
            disabled={!canPost}
            onClick={() => m.mutate()}
            className="gap-1.5"
          >
            {m.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {parentShipId ? "Reply" : active.cta}
          </Button>
        </div>
      </div>
    </div>
  );
}