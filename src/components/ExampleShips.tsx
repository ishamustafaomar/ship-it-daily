import { Sparkles, Link as LinkIcon } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { ToolTag } from "./ToolTag";

type Example = {
  name: string;
  handle: string;
  time: string;
  body: string;
  tool?: string;
  link?: string;
};

const EXAMPLES: Example[] = [
  {
    name: "Maya",
    handle: "maya",
    time: "2h",
    body: "Shipped a pricing page with Lovable today 🎉 Three tiers, Stripe checkout wired up, dark mode looks 🔥",
    tool: "Lovable",
    link: "example.com/pricing",
  },
  {
    name: "Devon",
    handle: "devon",
    time: "5h",
    body: "Day 1: fixed the auth redirect bug that ate 3 hours of my life 😅 turns out I was setting the session before the cookie landed. Cursor caught it once I pasted the stack trace.",
    tool: "Cursor",
  },
  {
    name: "Priya",
    handle: "priya",
    time: "1d",
    body: "Just added dark mode to my app with Bolt. Toggle in the header, respects OS preference, persists across reloads. Small win, big vibe upgrade ✨",
    tool: "Bolt",
  },
];

export function ExampleShips() {
  return (
    <div className="border-b border-border/70 px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          Welcome — here's what a ship looks like 👇
        </h2>
      </div>
      <div className="space-y-3">
        {EXAMPLES.map((ex, i) => (
          <article
            key={i}
            className="relative rounded-xl border border-dashed border-border bg-secondary/20 p-4 opacity-90"
          >
            <span className="absolute right-3 top-3 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-primary">
              Example
            </span>
            <div className="flex gap-3">
              <UserAvatar name={ex.name} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-semibold text-foreground">{ex.name}</span>
                  <span className="truncate text-muted-foreground">@{ex.handle}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-mono text-xs text-muted-foreground">{ex.time}</span>
                  {ex.tool ? (
                    <span className="ml-1">
                      <ToolTag tag={ex.tool} />
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[15px] leading-snug text-foreground">
                  {ex.body}
                </p>
                {ex.link ? (
                  <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 font-mono text-xs text-primary">
                    <LinkIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{ex.link}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          const el = document.querySelector<HTMLTextAreaElement>(
            'textarea[data-composer="true"]',
          );
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          el?.focus();
        }}
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Now post your first ship →
      </button>
    </div>
  );
}