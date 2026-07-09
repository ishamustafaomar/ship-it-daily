import { toolTagColor } from "@/lib/format";

export function ToolTag({ tag }: { tag: string | null | undefined }) {
  if (!tag) return null;
  return (
    <span
      className={`inline-flex items-center rounded-md border border-border/70 bg-secondary/40 px-1.5 py-0.5 font-mono text-[11px] leading-none ${toolTagColor(tag)}`}
    >
      [ {tag} ]
    </span>
  );
}