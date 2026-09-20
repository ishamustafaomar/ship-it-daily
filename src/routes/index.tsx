import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/home", search: { tab: "for_you", tag: "", tool: "" } });
  },
  head: () => ({
    meta: [
      { title: "ShippedIn — the daily feed for builders shipping with AI tools" },
      { name: "description", content: "See what builders shipped today with Lovable, Cursor, Bolt, v0, and Replit. Tag your tools, keep a streak, and get found." },
      { property: "og:title", content: "ShippedIn — the daily feed for builders shipping with AI tools" },
      { property: "og:description", content: "See what builders shipped today with Lovable, Cursor, Bolt, v0, and Replit." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://shippedin.dev/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://shippedin.dev/" }],
  }),
  component: () => null,
});
