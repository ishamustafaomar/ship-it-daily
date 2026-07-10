import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  getAutopostSettings,
  updateAutopostSettings,
  listAutopostHistory,
  previewAutopost,
  regenerateAutopost,
  updateAutopostDraft,
  publishAutopost,
  forceAutopostNow,
  deleteAutopostEntry,
} from "@/lib/autopost.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, RefreshCw, Send, Trash2, Zap, Loader2, Eye, Check, Pencil } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/autopost")({
  component: AdminAutopost,
});

function AdminAutopost() {
  const qc = useQueryClient();
  const settingsFn = useServerFn(getAutopostSettings);
  const updateFn = useServerFn(updateAutopostSettings);
  const historyFn = useServerFn(listAutopostHistory);
  const previewFn = useServerFn(previewAutopost);
  const forceFn = useServerFn(forceAutopostNow);

  const { data: settings } = useQuery({
    queryKey: ["admin", "autopost", "settings"],
    queryFn: () => settingsFn(),
  });
  const { data: history, isLoading } = useQuery({
    queryKey: ["admin", "autopost", "history"],
    queryFn: () => historyFn({ data: { limit: 100 } }),
  });

  const [hourInput, setHourInput] = useState<string>("");

  const saveSettings = useMutation({
    mutationFn: (patch: { enabled?: boolean; post_hour_utc?: number }) => updateFn({ data: patch }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "autopost", "settings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const preview = useMutation({
    mutationFn: () => previewFn(),
    onSuccess: () => {
      toast.success("Preview generated");
      qc.invalidateQueries({ queryKey: ["admin", "autopost", "history"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Generation failed"),
  });

  const forceNow = useMutation({
    mutationFn: () => forceFn(),
    onSuccess: () => {
      toast.success("Posted to feed");
      qc.invalidateQueries({ queryKey: ["admin", "autopost", "history"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const currentHour = settings?.post_hour_utc ?? 10;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Autoposting</h1>
        <p className="text-sm text-muted-foreground">
          One AI-generated post per day from @shippedin. Runs when the UTC hour below matches.
        </p>
      </div>

      <div className="rounded-lg border border-border/70 bg-card p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Switch
              checked={!!settings?.enabled}
              onCheckedChange={(v) => saveSettings.mutate({ enabled: v })}
              id="autopost-enabled"
            />
            <Label htmlFor="autopost-enabled" className="cursor-pointer">
              {settings?.enabled ? "Enabled" : "Disabled"}
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Post at (UTC hour)</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={hourInput === "" ? String(currentHour) : hourInput}
              onChange={(e) => setHourInput(e.target.value)}
              className="w-20"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const n = Number(hourInput);
                if (!Number.isInteger(n) || n < 0 || n > 23) return toast.error("0–23");
                saveSettings.mutate({ post_hour_utc: n });
                setHourInput("");
              }}
            >
              Save
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            {settings?.last_run_at
              ? `Last run ${formatDistanceToNow(new Date(settings.last_run_at), { addSuffix: true })}`
              : "Never run yet"}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => preview.mutate()}
            disabled={preview.isPending}
            variant="secondary"
            className="gap-2"
          >
            {preview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Preview tomorrow's post
          </Button>
          <Button
            onClick={() => forceNow.mutate()}
            disabled={forceNow.isPending}
            className="gap-2"
          >
            {forceNow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Force post now
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          History {history ? `(${history.length})` : ""}
        </h2>
        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : !history || history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
            Nothing generated yet. Try "Preview tomorrow's post".
          </div>
        ) : (
          <ul className="space-y-3">
            {history.map((h: any) => (
              <HistoryRow key={h.id} row={h} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function HistoryRow({ row }: { row: any }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState<string>(row.generated_text);
  const updateFn = useServerFn(updateAutopostDraft);
  const publishFn = useServerFn(publishAutopost);
  const regenFn = useServerFn(regenerateAutopost);
  const deleteFn = useServerFn(deleteAutopostEntry);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "autopost", "history"] });

  const save = useMutation({
    mutationFn: () => updateFn({ data: { id: row.id, generated_text: text } }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const publish = useMutation({
    mutationFn: () => publishFn({ data: { id: row.id } }),
    onSuccess: () => {
      toast.success("Published to feed");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const regen = useMutation({
    mutationFn: () => regenFn({ data: { id: row.id } }),
    onSuccess: () => {
      toast.success("Regenerated");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const del = useMutation({
    mutationFn: () => deleteFn({ data: { id: row.id } }),
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <li className="rounded-lg border border-border/70 bg-card p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-md px-1.5 py-0.5 font-mono ${
            row.published
              ? "bg-primary/15 text-primary"
              : row.error
                ? "bg-destructive/15 text-destructive"
                : "bg-secondary text-muted-foreground"
          }`}
        >
          {row.published ? "PUBLISHED" : row.error ? "ERROR" : "DRAFT"}
        </span>
        <span className="font-mono text-muted-foreground">[{row.category}]</span>
        <span className="font-mono text-muted-foreground">{row.post_type}</span>
        {row.tool_tag ? <span className="font-mono text-muted-foreground">[{row.tool_tag}]</span> : null}
        {(row.topic_tags ?? []).map((t: string) => (
          <span key={t} className="font-mono text-muted-foreground">
            #{t}
          </span>
        ))}
        <span className="ml-auto text-muted-foreground">
          {formatDistanceToNow(new Date(row.generated_at), { addSuffix: true })}
          {row.attempts > 1 ? ` · ${row.attempts} tries` : ""}
        </span>
      </div>

      {editing ? (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={560}
          className="min-h-[120px]"
        />
      ) : (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{row.generated_text}</p>
      )}

      {row.error ? (
        <p className="mt-2 text-xs text-destructive">Error: {row.error}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {row.published ? (
          <Button size="sm" variant="destructive" onClick={() => del.mutate()} className="gap-1">
            <Trash2 className="h-3.5 w-3.5" />
            Delete post
          </Button>
        ) : (
          <>
            {editing ? (
              <>
                <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending} className="gap-1">
                  <Check className="h-3.5 w-3.5" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setText(row.generated_text);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)} className="gap-1">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => regen.mutate()}
              disabled={regen.isPending}
              className="gap-1"
            >
              {regen.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Regenerate
            </Button>
            <Button
              size="sm"
              onClick={() => publish.mutate()}
              disabled={publish.isPending}
              className="gap-1"
            >
              {publish.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Publish
            </Button>
            <Button size="sm" variant="ghost" onClick={() => del.mutate()} className="gap-1 text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </>
        )}
      </div>
    </li>
  );
}