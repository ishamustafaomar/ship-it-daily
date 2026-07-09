import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://shippedin.dev/blog/building-in-public-with-ai";
const TITLE = "Building in Public with AI: A Practical Guide for 2026";
const DESCRIPTION =
  "How to build in public with AI tools like Lovable, Cursor, Bolt, Replit, and v0 — daily shipping streaks, feedback loops, and growing an audience while you ship.";

export const Route = createFileRoute("/blog/building-in-public-with-ai")({
  component: BuildingInPublicGuide,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          author: { "@type": "Organization", name: "ShippedIn" },
          publisher: { "@type": "Organization", name: "ShippedIn" },
          mainEntityOfPage: URL,
          datePublished: "2026-07-09",
        }),
      },
    ],
  }),
});

function BuildingInPublicGuide() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="font-mono text-lg font-semibold tracking-tight">ShippedIn</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Join ShippedIn
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <article className="prose prose-invert max-w-none">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Guide · Build in public
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Building in Public with AI: A Practical Guide
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Building in public means shipping your work — code, product, decisions,
            mistakes — where other people can see it. Doing it with AI tools like{" "}
            <a href="https://lovable.dev" className="text-primary hover:underline">Lovable</a>,
            Cursor, Bolt, Replit, and v0 changes the tempo: you can ship something
            real every single day. This guide covers how to make that a durable
            habit and turn it into an audience.
          </p>

          <h2 className="mt-12 text-2xl font-semibold text-foreground">Why build in public with AI</h2>
          <p className="mt-4 text-muted-foreground">
            The traditional "build in public" playbook was written for founders
            who shipped weekly. AI codegen collapses that cycle to hours. A single
            builder using Lovable can go from prompt to deployed URL before lunch,
            which means the story you're telling isn't "here's a roadmap" — it's
            "here's what I shipped today, and here's what broke."
          </p>
          <p className="mt-4 text-muted-foreground">
            That shift matters for three reasons:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
            <li><strong className="text-foreground">Feedback loops shrink.</strong> Post a screenshot, get a bug report the same afternoon.</li>
            <li><strong className="text-foreground">Your audience compounds.</strong> Daily posts are the fastest way to be discoverable in a noisy feed.</li>
            <li><strong className="text-foreground">The work is the marketing.</strong> The demo <em>is</em> the post; no separate content plan required.</li>
          </ul>

          <h2 className="mt-12 text-2xl font-semibold text-foreground">The daily shipping streak</h2>
          <p className="mt-4 text-muted-foreground">
            The single highest-leverage habit for building in public is a
            shipping streak: one post per day about something you actually
            shipped. Not a plan, not an idea — a change users could touch.
          </p>
          <p className="mt-4 text-muted-foreground">
            What counts as "shipped" is broader than a deploy:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
            <li>A new feature live in production</li>
            <li>A bug you found and fixed in front of everyone</li>
            <li>A tool comparison or teardown you learned something from</li>
            <li>A prompt or workflow that saved you an hour</li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            ShippedIn is built around this loop — every post is tagged with the
            AI tool that helped you ship it, and your streak counter lives at
            the top of your profile. Miss a day, it resets. The visible streak
            does more for consistency than any productivity system.
          </p>

          <h2 className="mt-12 text-2xl font-semibold text-foreground">Choosing your stack</h2>
          <p className="mt-4 text-muted-foreground">
            Most builders shipping in public today are combining two or three
            AI tools:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
            <li><strong className="text-foreground">Lovable</strong> — full-stack web apps from a prompt, with Supabase wired in.</li>
            <li><strong className="text-foreground">Cursor</strong> — AI-native editor for iterating on the generated code.</li>
            <li><strong className="text-foreground">Bolt</strong> — quick web prototypes in the browser.</li>
            <li><strong className="text-foreground">Replit</strong> — end-to-end app building with hosting baked in.</li>
            <li><strong className="text-foreground">v0</strong> — component and UI generation.</li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            The right choice is the one that lets you ship <em>today</em>. Pick
            one, ship the smallest possible thing, post it, then iterate.
          </p>

          <h2 className="mt-12 text-2xl font-semibold text-foreground">Post types that work</h2>
          <p className="mt-4 text-muted-foreground">
            Four formats consistently drive engagement in build-in-public feeds:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
            <li><strong className="text-foreground">Ship</strong> — "I shipped X today, here's the link."</li>
            <li><strong className="text-foreground">Ask</strong> — "Has anyone solved Y with tool Z?"</li>
            <li><strong className="text-foreground">Feedback</strong> — "Roast this landing page."</li>
            <li><strong className="text-foreground">Discussion</strong> — "Here's what I learned about prompting for auth flows."</li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            Rotate through them. Pure "ship" posts every day get flat; asks and
            discussions bring replies, which bring reach.
          </p>

          <h2 className="mt-12 text-2xl font-semibold text-foreground">Growing an audience while you build</h2>
          <p className="mt-4 text-muted-foreground">
            Audience follows consistency more than quality. Three rules:
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-muted-foreground">
            <li>Post the same day you ship, not later.</li>
            <li>Reply to every comment on your posts for the first month.</li>
            <li>Follow ten other builders you'd want feedback from, and actually engage with their work.</li>
          </ol>
          <p className="mt-4 text-muted-foreground">
            Communities like ShippedIn concentrate the audience that already
            cares about AI-built apps, which means you skip the cold-start
            problem of posting into an empty feed.
          </p>

          <h2 className="mt-12 text-2xl font-semibold text-foreground">Start today</h2>
          <p className="mt-4 text-muted-foreground">
            The whole point is momentum. Pick a tool, ship the smallest possible
            thing before you close your laptop, and post it. Then do it again
            tomorrow.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Start your streak on ShippedIn
            </Link>
            <Link
              to="/"
              className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/60"
            >
              Back to home
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
