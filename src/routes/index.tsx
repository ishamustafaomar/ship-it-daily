import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Flame, Link as LinkIcon, Tag, Trophy, Users } from "lucide-react";
import { useEffect } from "react";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "ShippedIn — turn your daily ships into a public track record" },
      { name: "description", content: "A low-pressure build-in-public feed for builders using Lovable, Cursor, Bolt, v0, and Replit. Tag your tools, keep a streak, and get found by builders solving the same problems." },
      { property: "og:title", content: "ShippedIn — turn your daily ships into a public track record" },
      { property: "og:description", content: "A low-pressure build-in-public feed for builders using Lovable, Cursor, Bolt, v0, and Replit. Tag your tools, keep a streak, and get found by builders solving the same problems." },
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
          Turn your daily work into a
          <br />
          <span className="text-primary">public track record.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          A low-pressure feed for builders shipping with Lovable, Cursor, Bolt, v0, and Replit.
          Tag the tool, post what you built, and get found by people solving the same problems.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to={signedIn ? "/home" : "/auth"}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {signedIn ? "Open app" : "Start your streak"}
          </Link>
        </div>

        <section aria-labelledby="why-shippedin" className="mt-20 text-left">
          <h2 id="why-shippedin" className="text-center text-lg font-semibold text-foreground">
            Why use ShippedIn
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
            Concrete benefits for builders who ship with AI tools.
          </p>

          <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-3">
                <Tag className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Get discovered by builders using the same tools
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Tag every ship with the tool you used — Lovable, Cursor, Bolt, v0, Replit, or anything else.
                  Other builders searching that tool find you instantly.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {[
              {
                icon: Trophy,
                title: "Build proof of what you've shipped",
                body: "A running log of real projects, fixes, and launches. No portfolio needed.",
              },
              {
                icon: Users,
                title: "Find people stuck on the same thing",
                body: "See ships tagged with the problems you're solving. Jump into threads, ask questions, share how you got past it.",
              },
              {
                icon: Flame,
                title: "Stay consistent without the grind",
                body: "One small ship a day keeps your streak alive. Low pressure, high momentum.",
              },
              {
                icon: LinkIcon,
                title: "Link out to what you built",
                body: "Every ship can include a link to your project, demo, repo, or landing page. Show, don't just tell.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-5">
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
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
