import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getMyProfile, updateMyProfile } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const meFn = useServerFn(getMyProfile);
  const saveFn = useServerFn(updateMyProfile);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });

  const [username, setUsername] = useState("");
  const [display, setDisplay] = useState("");
  const [building, setBuilding] = useState("");

  useEffect(() => {
    if (me?.username) navigate({ to: "/home" });
    if (me?.display_name && !display) setDisplay(me.display_name);
  }, [me, navigate, display]);

  const save = useMutation({
    mutationFn: async () =>
      saveFn({
        data: {
          username: username.trim().toLowerCase(),
          display_name: display.trim(),
          building_now: building.trim() || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      navigate({ to: "/home" });
    },
    onError: (e: any) =>
      toast.error(e?.message?.includes("duplicate") ? "That username is taken" : e?.message ?? "Failed"),
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold tracking-tight">Set up your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">Just a couple things, then you're in.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="mt-6 space-y-4"
      >
        <div>
          <Label htmlFor="username" className="text-xs">Username</Label>
          <Input
            id="username"
            required
            minLength={2}
            maxLength={24}
            pattern="[a-zA-Z0-9_]+"
            placeholder="yourname"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 font-mono"
          />
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">letters, numbers, underscores</p>
        </div>
        <div>
          <Label htmlFor="display" className="text-xs">Display name</Label>
          <Input
            id="display"
            required
            maxLength={60}
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="building" className="text-xs">Currently building (optional)</Label>
          <Textarea
            id="building"
            maxLength={120}
            rows={2}
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            placeholder="A social feed for AI builders"
            className="mt-1 resize-none"
          />
        </div>
        <Button type="submit" className="w-full" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
        </Button>
      </form>
    </div>
  );
}