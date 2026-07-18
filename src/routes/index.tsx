import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Flame, Rocket, Users } from "lucide-react";
import { useEffect } from "react";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "ShippedIn — build in public with AI" },
      { name: "description", content: "A daily feed for builders shipping apps with Lovable, Cursor, Bolt, Replit, and v0. Post what you shipped, keep your streak, follow other builders." },
      { property: "og:title", content: "ShippedIn — build in public with AI" },
      { property: "og:description", content: "A daily feed for builders shipping apps with Lovable, Cursor, Bolt, Replit, and v0. Post what you shipped, keep your streak, follow other builders." },
      { property: "og:url", content: "https://shippedin.dev/" },
    ],
    links: [{ rel: "canonical", href: "https://shippedin.dev/" }],
  }),
});

function Landing() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && session) navigate({ to: "/home", replace: true });
  }, [session, loading, navigate]);
  const signedIn = !!session;
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="font-mono text-lg font-semibold tracking-tight">ShippedIn</span>
        </div>
        <div className="flex items-center gap-3">
          {signedIn ? (
            <Link
              to="/home"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 font-mono text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Build in public, one day at a time
        </div>
        <h1 className="mx-auto max-w-2xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
          Ship something today.
          <br />
          <span className="text-primary">Keep your streak.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          A daily feed for builders shipping apps and sites with Lovable, Cursor, Bolt, Replit, and v0.
          Post what you shipped, tag the tool, follow other builders.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to={signedIn ? "/home" : "/auth"}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {signedIn ? "Open app" : "Start your streak"}
          </Link>
        </div>

        <h2 className="sr-only">Why ShippedIn</h2>
        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            { icon: Rocket, title: "Ship daily", body: "Post short updates on what you built or learned today." },
            { icon: Flame, title: "Keep a streak", body: "One ship per day keeps the flame alive." },
            { icon: Users, title: "Find your people", body: "Follow builders shipping with the same tools as you." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5 text-left">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
      <footer className="mx-auto max-w-6xl border-t border-border/70 px-6 py-6 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-xs">© ShippedIn</span>
          <div className="flex flex-wrap gap-4">
            <Link to="/blog/building-in-public-with-ai" className="hover:text-foreground">
              Guide
            </Link>
            <Link to="/connect" className="hover:text-foreground">
              Connect to ChatGPT / Claude
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
