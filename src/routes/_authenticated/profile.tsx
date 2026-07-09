import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { getMyProfile } from "@/lib/api.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfileRedirect,
  head: () => ({
    meta: [
      { title: "Your profile — ShippedIn" },
      { name: "description", content: "Your ShippedIn profile, streak, and ships." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ProfileRedirect() {
  const navigate = useNavigate();
  const meFn = useServerFn(getMyProfile);
  const { data: me, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  useEffect(() => {
    if (!me) return;
    if (me.username) navigate({ to: "/u/$username", params: { username: me.username } });
    else navigate({ to: "/onboarding" });
  }, [me, navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}