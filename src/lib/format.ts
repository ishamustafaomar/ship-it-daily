export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const TOOL_TAGS = ["Lovable", "Cursor", "Bolt", "Replit", "v0", "Other"] as const;
export type ToolTag = (typeof TOOL_TAGS)[number];

export function toolTagColor(tag: string | null | undefined): string {
  if (!tag) return "";
  const map: Record<string, string> = {
    Lovable: "text-pink-300",
    Cursor: "text-blue-300",
    Bolt: "text-yellow-300",
    Replit: "text-orange-300",
    v0: "text-purple-300",
  };
  return map[tag] ?? "text-muted-foreground";
}