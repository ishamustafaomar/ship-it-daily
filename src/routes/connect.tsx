import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Connect ShippedIn to ChatGPT or Claude" },
      {
        name: "description",
        content:
          "Connect ShippedIn to your AI assistant (ChatGPT or Claude) so it can read your feed and post ships for you.",
      },
      { property: "og:title", content: "Connect ShippedIn to your AI assistant" },
      {
        property: "og:description",
        content:
          "Add ShippedIn as a connector in ChatGPT or Claude and let your assistant read your feed and post ships.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectPage,
});

function ConnectPage() {
  const [mcpUrl, setMcpUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMcpUrl(new URL("/mcp", window.location.origin).toString());
  }, []);

  async function copy() {
    if (!mcpUrl) return;
    await navigator.clipboard.writeText(mcpUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">
          Agent integrations
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Connect ShippedIn to your AI assistant
        </h1>
        <p className="mt-3 text-muted-foreground">
          Let ChatGPT or Claude read your feed and post ships for you. You'll sign in
          with your ShippedIn account when you connect.
        </p>
      </div>

      <section className="mb-10 rounded-lg border border-border/70 bg-secondary/40 p-4">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Your server URL
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-md bg-background px-3 py-2 font-mono text-sm">
            {mcpUrl || "…"}
          </code>
          <Button size="sm" variant="secondary" onClick={copy} className="gap-1.5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Paste this into the connector setup in ChatGPT or Claude below. Your
          assistant will be able to read your feed, view ships, post new ships, and
          reply — all as you.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">ChatGPT</h2>
        <ol className="space-y-3 text-sm">
          <li className="rounded-md border border-border/70 p-3">
            <span className="mr-2 font-mono text-primary">1.</span>
            Open{" "}
            <a
              href="https://chatgpt.com/#settings/Connectors/Advanced"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              ChatGPT → Settings → Connectors → Advanced
            </a>{" "}
            and enable <strong>Developer mode</strong>. Read the risk notice shown
            there.
          </li>
          <li className="rounded-md border border-border/70 p-3">
            <span className="mr-2 font-mono text-primary">2.</span>
            In the chat composer's <strong>+</strong> menu, turn on{" "}
            <strong>Developer mode</strong>.
          </li>
          <li className="rounded-md border border-border/70 p-3">
            <span className="mr-2 font-mono text-primary">3.</span>
            Click <strong>Add sources</strong>, then <strong>Connect more</strong>.
          </li>
          <li className="rounded-md border border-border/70 p-3">
            <span className="mr-2 font-mono text-primary">4.</span>
            Name the connector <em>ShippedIn</em> and paste the URL above.
          </li>
          <li className="rounded-md border border-border/70 p-3">
            <span className="mr-2 font-mono text-primary">5.</span>
            Sign in with your ShippedIn account, then ask ChatGPT to post a ship or
            read your feed.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Claude</h2>
        <ol className="space-y-3 text-sm">
          <li className="rounded-md border border-border/70 p-3">
            <span className="mr-2 font-mono text-primary">1.</span>
            Open{" "}
            <a
              href="https://claude.ai/customize/connectors?modal=add-custom-connector"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Claude → Add custom connector
            </a>
            .
          </li>
          <li className="rounded-md border border-border/70 p-3">
            <span className="mr-2 font-mono text-primary">2.</span>
            Name the connector <em>ShippedIn</em> and paste the URL above.
          </li>
          <li className="rounded-md border border-border/70 p-3">
            <span className="mr-2 font-mono text-primary">3.</span>
            Enable the connector from the chat composer, then ask Claude to use
            ShippedIn.
          </li>
        </ol>
      </section>
    </main>
  );
}