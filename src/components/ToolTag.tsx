import { Link } from "@tanstack/react-router";
import { toolTagColor } from "@/lib/format";

export function ToolTag({
  tag,
  clickable = true,
}: {
  tag: string | null | undefined;
  clickable?: boolean;
}) {
  if (!tag) return null;
  const cls = `inline-flex items-center rounded-md border border-border/70 bg-secondary/40 px-1.5 py-0.5 font-mono text-[11px] leading-none ${toolTagColor(tag)}`;
  if (!clickable) return <span className={cls}>[ {tag} ]</span>;
  return (
    <Link
      to="/home"
      search={{ tab: "for_you", tag: "", tool: tag }}
      onClick={(e) => e.stopPropagation()}
      className={`${cls} transition-colors hover:bg-secondary`}
      title={`Filter by ${tag}`}
    >
      [ {tag} ]
    </Link>
  );
}