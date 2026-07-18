import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Flame, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RightRail } from "@/components/RightRail";
import { ShipCard } from "@/components/ShipCard";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { TagInput } from "@/components/TagInput";
import {
  getProfileByUsername,
  getPublicProfile,
  toggleFollow,
  updateMyProfile,
} from "@/lib/api.functions";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/u/$username")({
  component: ProfilePage,
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — ShippedIn` },
      { name: "description", content: `Ships, streak, and updates from @${params.username} on ShippedIn — a daily feed for builders shipping with AI tools.` },
      { property: "og:title", content: `@${params.username} on ShippedIn` },
      { property: "og:description", content: `Follow @${params.username}'s daily ships and streak on ShippedIn.` },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: `https://shippedin.dev/u/${params.username}` },
    ],
    links: [{ rel: "canonical", href: `https://shippedin.dev/u/${params.username}` }],
  }),
});

function ProfilePage() {
  const { username } = useParams({ from: "/u/$username" });
  const qc = useQueryClient();
  const { session, loading: sessionLoading } = useSession();
  const authedFn = useServerFn(getProfileByUsername);
  const publicFn = useServerFn(getPublicProfile);
  const followFn = useServerFn(toggleFollow);
  const { data, isLoading } = useQuery({
    queryKey: ["profile", username, !!session],
    enabled: !sessionLoading,
    queryFn: () =>
      session
        ? authedFn({ data: { username } })
        : publicFn({ data: { username } }),
  });

  const follow = useMutation({
    mutationFn: async (next: boolean) =>
      followFn({ data: { profileId: data!.profile.id, following: next } }),
    onMutate: (next) => {
      qc.setQueryData(["profile", username, !!session], (old: any) =>
        old
          ? {
              ...old,
              is_following: next,
              followers: old.followers + (next ? 1 : -1),
            }
          : old,
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["profile", username] }),
  });

  return (
    <AppShell right={<RightRail />}>
      {isLoading || sessionLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <p className="p-10 text-center text-sm text-muted-foreground">Profile not found.</p>
      ) : (
        <>
          <header className="border-b border-border/70 p-4">
            <div className="flex items-start gap-4">
              <UserAvatar url={data.profile.avatar_url} name={data.profile.display_name} size={72} />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold">{data.profile.display_name ?? data.profile.username}</h1>
                <p className="font-mono text-sm text-muted-foreground">@{data.profile.username}</p>
                {data.profile.building_now ? (
                  <p className="mt-2 rounded-md border border-border/60 bg-secondary/40 px-2 py-1 font-mono text-xs text-muted-foreground">
                    building: <span className="text-foreground">{data.profile.building_now}</span>
                  </p>
                ) : null}
                {data.profile.bio ? (
                  <p className="mt-2 text-sm text-foreground">{data.profile.bio}</p>
                ) : null}
                <FocusTagsSection
                  isMe={data.is_me}
                  tags={(data.profile.focus_tags ?? []) as string[]}
                  onSaved={() => qc.invalidateQueries({ queryKey: ["profile", username] })}
                />
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1">
                    <Flame className={`h-4 w-4 ${data.profile.streak_count ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-mono">{data.profile.streak_count}</span>
                    <span className="text-muted-foreground">day streak</span>
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-mono text-foreground">{data.followers}</span> followers
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-mono text-foreground">{data.following}</span> following
                  </span>
                </div>
              </div>
              {!data.is_me && session ? (
                <Button
                  variant={data.is_following ? "secondary" : "default"}
                  onClick={() => follow.mutate(!data.is_following)}
                  size="sm"
                >
                  {data.is_following ? "Following" : "Follow"}
                </Button>
              ) : !data.is_me && !session ? (
                <Link to="/auth" search={{ next: `/u/${username}` }}>
                  <Button size="sm">Follow</Button>
                </Link>
              ) : (
                <EditProfileDialog
                  profile={data.profile}
                  onSaved={() => qc.invalidateQueries({ queryKey: ["profile", username] })}
                />
              )}
            </div>
          </header>

          <div>
            {data.ships.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">No ships yet.</p>
            ) : (
              data.ships.map((s) => (
                <ShipCard key={s.id} ship={s} myUserId={data.is_me ? data.profile.id : null} />
              ))
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

function FocusTagsSection({
  isMe,
  tags,
  onSaved,
}: {
  isMe: boolean;
  tags: string[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(tags);
  const saveFn = useServerFn(updateMyProfile);
  useEffect(() => setDraft(tags), [tags]);
  const save = useMutation({
    mutationFn: async () => saveFn({ data: { focus_tags: draft } }),
    onSuccess: () => {
      toast.success("Focus updated");
      setEditing(false);
      onSaved();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (!isMe && tags.length === 0) return null;

  return (
    <div className="mt-3">
      {editing ? (
        <div className="space-y-2">
          <TagInput value={draft} onChange={setDraft} max={5} placeholder="focus tags" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(tags);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] text-muted-foreground">focus:</span>
          {tags.length === 0 ? (
            <span className="font-mono text-[11px] text-muted-foreground">none yet</span>
          ) : (
            tags.map((t) => (
              <Link
                key={t}
                to="/home"
                search={{ tag: t }}
                className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary hover:bg-primary/20"
              >
                #{t}
              </Link>
            ))
          )}
          {isMe ? (
            <button
              onClick={() => setEditing(true)}
              className="ml-1 font-mono text-[11px] text-muted-foreground hover:text-foreground underline"
            >
              edit
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function EditProfileDialog({
  profile,
  onSaved,
}: {
  profile: {
    id: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
  };
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const saveFn = useServerFn(updateMyProfile);

  useEffect(() => {
    if (open) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [open, profile]);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("ship-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      // Store a storage reference; UserAvatar mints a fresh signed URL on
      // each load so photos never break when the signature expires.
      setAvatarUrl(`storage:ship-images/${path}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const save = useMutation({
    mutationFn: async () =>
      saveFn({
        data: {
          display_name: displayName.trim() || undefined,
          bio: bio.trim() ? bio.trim() : null,
          avatar_url: avatarUrl,
        },
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      setOpen(false);
      onSaved();
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">Edit profile</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <UserAvatar url={avatarUrl} name={displayName} size={64} />
            <div className="flex flex-col gap-1.5">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                    e.target.value = "";
                  }}
                />
                <span className="inline-flex items-center rounded-md border border-border bg-secondary px-3 py-1.5 text-xs hover:bg-secondary/80">
                  {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
                </span>
              </label>
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="text-left font-mono text-[11px] text-muted-foreground hover:text-foreground underline"
                >
                  remove
                </button>
              ) : null}
            </div>
          </div>
          <div>
            <Label htmlFor="display_name" className="text-xs">Display name</Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="bio" className="text-xs">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={3}
              className="mt-1"
            />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{bio.length}/280</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || uploading}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}