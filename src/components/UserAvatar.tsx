import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserAvatar({
  url,
  name,
  size = 40,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initial = (name ?? "?").slice(0, 1).toUpperCase();
  return (
    <Avatar style={{ width: size, height: size }} className="border border-border/60">
      {url ? <AvatarImage src={url} alt={name ?? ""} /> : null}
      <AvatarFallback className="bg-secondary text-secondary-foreground font-mono text-sm">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}