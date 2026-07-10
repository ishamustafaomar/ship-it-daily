import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, PartyPopper } from "lucide-react";
import { getMyProfile, updateMyProfile } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/TagInput";
import { Composer } from "@/components/Composer";

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
  const [focusTags, setFocusTags] = useState<string[]>([]);
  const [step, setStep] = useState<"profile" | "first-ship">("profile");

  useEffect(() => {
    // Only auto-redirect if the user already has a username AND we're not
    // in the middle of the fresh-signup first-ship flow.
    if (me?.username && step === "profile") navigate({ to: "/home" });
    if (me?.display_name && !display) setDisplay(me.display_name);
  }, [me, navigate, display, step]);

  const save = useMutation({
    mutationFn: async () =>
      saveFn({
        data: {
          username: username.trim().toLowerCase(),
          display_name: display.trim(),
          building_now: building.trim() || null,
          focus_tags: focusTags,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      setStep("first-ship");
    },
    onError: (e: any) =>
      toast.error(e?.message?.includes("duplicate") ? "That username is taken" : e?.message ?? "Failed"),
  });

  if (step === "first-ship" && me?.id) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
        <div className="mb-4 inline-flex items-center gap-2 self-start rounded-full bg-primary/15 px-3 py-1 font-mono text-xs text-primary">
          <PartyPopper className="h-3.5 w-3.5" /> you're in, @{me.username}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Ship your first thing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One line about what you shipped, learned, or are stuck on today. This starts your streak.
        </p>
        <div className="mt-5 rounded-xl border border-border bg-card">
          <Composer
            myUserId={me.id}
            avatarUrl={me.avatar_url}
            autoFocus
            placeholder="What did you ship today?"
            onDone={() => navigate({ to: "/home" })}
          />
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="mt-4 self-center font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          skip for now →
        </button>
      </div>
    );
  }

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
        <div>
          <Label className="text-xs">What are you working on? (optional)</Label>
          <p className="mt-1 mb-2 font-mono text-[11px] text-muted-foreground">
            up to 5 tags — powers your Relevant feed
          </p>
          <TagInput
            value={focusTags}
            onChange={setFocusTags}
            max={5}
            placeholder="auth, stripe-payments, onboarding…"
          />
        </div>
        <Button type="submit" className="w-full" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
        </Button>
      </form>
    </div>
  );
}