import { useRef, useState } from "react";
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

const NONE = "__none__";

export function Composer({
  myUserId,
  avatarUrl,
  parentShipId = null,
  placeholder = "What did you ship today?",
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
  const [body, setBody] = useState("");
  const [tool, setTool] = useState<string>(NONE);
  const [link, setLink] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const m = useMutation({
    mutationFn: async () =>
      create({
        data: {
          body: body.trim(),
          tool_tag: tool === NONE ? null : tool,
          link_url: link.trim() || null,
          image_url: imagePath,
          parent_ship_id: parentShipId,
        },
      }),
    onSuccess: () => {
      setBody("");
      setTool(NONE);
      setLink("");
      setShowLink(false);
      setImagePath(null);
      setImagePreview(null);
      qc.invalidateQueries();
      toast.success(parentShipId ? "Reply posted" : "Shipped!");
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
      setImagePath(path);
      setImagePreview(signed?.signedUrl ?? null);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const len = body.length;
  const canPost = body.trim().length > 0 && !m.isPending && !uploading;

  return (
    <div className="flex gap-3 p-4">
      <UserAvatar url={avatarUrl} size={40} />
      <div className="min-w-0 flex-1">
        <Textarea
          autoFocus={autoFocus}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          rows={parentShipId ? 2 : 3}
          className="resize-none border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0 p-0 shadow-none"
          maxLength={560}
        />

        {showLink ? (
          <div className="mt-2 flex items-center gap-2">
            <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://your-link.com"
              className="h-8 font-mono text-xs"
            />
          </div>
        ) : null}

        {imagePreview ? (
          <div className="relative mt-2 overflow-hidden rounded-lg border border-border">
            <img src={imagePreview} alt="" className="max-h-72 w-full object-cover" />
            <button
              onClick={() => {
                setImagePath(null);
                setImagePreview(null);
              }}
              className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-foreground hover:bg-background"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-2">
          <Select value={tool} onValueChange={setTool}>
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
            onClick={() => setShowLink((s) => !s)}
            className={`rounded-md p-1.5 hover:bg-secondary ${
              showLink ? "text-primary" : "text-muted-foreground"
            }`}
            aria-label="Toggle link"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Upload image"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
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
            {parentShipId ? "Reply" : "Ship"}
          </Button>
        </div>
      </div>
    </div>
  );
}