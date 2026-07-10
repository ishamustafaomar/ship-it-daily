import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X, Plus } from "lucide-react";
import { getTagSuggestions, normalizeTag } from "@/lib/api.functions";

export function TagInput({
  value,
  onChange,
  max,
  placeholder = "add tag",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  max: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fn = useServerFn(getTagSuggestions);
  const { data } = useQuery({
    queryKey: ["tagSuggestions", draft],
    queryFn: () => fn({ data: { q: draft } }),
    staleTime: 30_000,
  });

  const suggestions = useMemo(
    () => (data?.items ?? []).filter((s) => !value.includes(s.tag)).slice(0, 8),
    [data, value],
  );

  function add(raw: string) {
    const t = normalizeTag(raw);
    if (!t || t.length < 2) return;
    if (value.includes(t)) return;
    if (value.length >= max) return;
    onChange([...value, t]);
    setDraft("");
    inputRef.current?.focus();
  }
  function remove(t: string) {
    onChange(value.filter((x) => x !== t));
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-secondary/30 px-2 py-1.5">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[11px] text-primary"
          >
            #{t}
            <button
              type="button"
              onClick={() => remove(t)}
              className="rounded-full hover:bg-primary/25"
              aria-label={`Remove ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {value.length < max ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "," || e.key === " ") {
                if (draft.trim()) {
                  e.preventDefault();
                  add(draft);
                }
              } else if (e.key === "Backspace" && !draft && value.length) {
                remove(value[value.length - 1]);
              }
            }}
            placeholder={value.length === 0 ? placeholder : ""}
            className="min-w-[80px] flex-1 bg-transparent font-mono text-xs outline-none placeholder:text-muted-foreground"
          />
        ) : null}
      </div>
      {open && (suggestions.length > 0 || draft.trim()) ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          {draft.trim() &&
          !suggestions.some((s) => s.tag === normalizeTag(draft)) &&
          normalizeTag(draft).length >= 2 ? (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                add(draft);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-xs text-foreground hover:bg-secondary"
            >
              <Plus className="h-3 w-3" /> create #{normalizeTag(draft)}
            </button>
          ) : null}
          {suggestions.map((s) => (
            <button
              key={s.tag}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                add(s.tag);
              }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left font-mono text-xs text-foreground hover:bg-secondary"
            >
              <span>#{s.tag}</span>
              <span className="text-muted-foreground">{s.count}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}