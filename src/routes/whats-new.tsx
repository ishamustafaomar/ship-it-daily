import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { LegalFooter } from "@/components/LegalFooter";

export const Route = createFileRoute("/whats-new")({
  head: () => ({
    meta: [
      { title: "What's New — ShippedIn" },
      { name: "description", content: "Recent improvements to ShippedIn, the build-in-public feed for AI builders." },
      { property: "og:title", content: "What's New — ShippedIn" },
      { property: "og:description", content: "The latest improvements to posting and building in public on ShippedIn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://shippedin.dev/whats-new" }],
  }),
  component: WhatsNew,
});

function WhatsNew() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-8">
      <Link to="/home" search={{ tab: "for_you", tag: "", tool: "" }} className="inline-flex items-center gap-2 font-mono font-semibold"><BrandMark /> ShippedIn</Link>
      <main className="py-10">
        <h1 className="text-3xl font-semibold">What's New</h1>
        <article className="mt-8 border-t border-border pt-6">
          <time dateTime="2026-10-26" className="font-mono text-xs text-muted-foreground">October 26, 2026</time>
          <h2 className="mt-2 text-xl font-semibold">Pick up where you left off</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Unfinished posts and replies now save on your device. Your text, post type, link, topics, tool and uploaded image stay with you when you open a post, visit Explore or reload. Each thread keeps its own reply draft. Drafts clear after posting successfully or choosing Discard.</p>
        </article>
      </main>
      <LegalFooter />
    </div>
  );
}