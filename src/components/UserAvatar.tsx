import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

// In-memory cache of resolved signed URLs. Keyed by storage:bucket/path,
// value is { url, expires } — we mint 1-hour signed URLs and refresh well
// before expiry so photos never break after a page refresh.
const SIGNED_TTL_SECONDS = 60 * 60;
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh 5min before expiry
const cache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string | null>>();

async function resolveStorageRef(ref: string): Promise<string | null> {
  const now = Date.now();
  const hit = cache.get(ref);
  if (hit && hit.expires - now > REFRESH_MARGIN_MS) return hit.url;
  const existing = inflight.get(ref);
  if (existing) return existing;
  const match = /^storage:([^/]+)\/(.+)$/i.exec(ref);
  if (!match) return null;
  const [, bucket, path] = match;
  const promise = supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_TTL_SECONDS)
    .then(({ data, error }) => {
      if (error || !data) return null;
      cache.set(ref, { url: data.signedUrl, expires: now + SIGNED_TTL_SECONDS * 1000 });
      return data.signedUrl;
    })
    .finally(() => inflight.delete(ref));
  inflight.set(ref, promise);
  return promise;
}

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
  const isStorageRef = !!url && url.startsWith("storage:");
  const [resolved, setResolved] = useState<string | null>(() =>
    isStorageRef ? cache.get(url!)?.url ?? null : null,
  );
  useEffect(() => {
    if (!isStorageRef || !url) return;
    let cancelled = false;
    void resolveStorageRef(url).then((u) => {
      if (!cancelled) setResolved(u);
    });
    return () => {
      cancelled = true;
    };
  }, [url, isStorageRef]);
  const src = isStorageRef ? resolved : url;
  return (
    <Avatar style={{ width: size, height: size }} className="border border-border/60">
      {src ? <AvatarImage src={src} alt={name ?? ""} /> : null}
      <AvatarFallback className="bg-secondary text-secondary-foreground font-mono text-sm">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}