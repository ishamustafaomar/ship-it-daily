import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LegalFooter } from "@/components/LegalFooter";

const LAST_UPDATED = "July 18, 2026";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ShippedIn" },
      {
        name: "description",
        content:
          "The rules for using ShippedIn — a plain-English terms of service for the build-in-public feed.",
      },
      { property: "og:title", content: "Terms of Service — ShippedIn" },
      {
        property: "og:description",
        content: "The rules for using ShippedIn.",
      },
      { property: "og:url", content: "https://shippedin.dev/terms" },
    ],
    links: [{ rel: "canonical", href: "https://shippedin.dev/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="font-mono text-lg font-semibold tracking-tight">ShippedIn</span>
        </Link>
        <Link
          to="/privacy"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Privacy
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-20">
        <article>
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Last updated: {LAST_UPDATED}
          </p>

          <div className="mt-6 rounded-md border border-border bg-card/60 p-4 text-sm text-muted-foreground">
            ShippedIn is an early-stage product. These terms are written in
            plain English and may be updated as the product evolves. We'll
            update the date above when we make changes.
          </div>

          <Section title="Using ShippedIn">
            <p>
              ShippedIn is a build-in-public social feed for people shipping
              with AI tools. By creating an account or using the site, you
              agree to these terms. If you don't agree, don't use ShippedIn.
            </p>
          </Section>

          <Section title="Your account">
            <ul>
              <li>You must be at least 13 years old to use ShippedIn.</li>
              <li>
                Keep your login credentials safe. You're responsible for
                activity on your account.
              </li>
              <li>
                Provide accurate info when you sign up and keep your profile
                reasonably up to date.
              </li>
            </ul>
          </Section>

          <Section title="Your content">
            <p>
              You own the content you post. By posting on ShippedIn you grant
              us a non-exclusive, worldwide license to host, display, and
              distribute that content on the site and in related contexts
              (e.g. share previews) so we can operate the service.
            </p>
            <p>
              You're responsible for what you post. Don't post content you
              don't have the right to share.
            </p>
          </Section>

          <Section title="Acceptable use">
            <p>Don't use ShippedIn to:</p>
            <ul>
              <li>Harass, threaten, or abuse other people.</li>
              <li>Post spam, scams, malware, or illegal content.</li>
              <li>
                Post sexual content involving minors, or other content that
                violates the law.
              </li>
              <li>
                Impersonate other people or misrepresent your identity in a
                misleading way.
              </li>
              <li>
                Scrape, overload, or otherwise abuse the service or its APIs.
              </li>
              <li>
                Attempt to bypass security, rate limits, or access data you
                aren't authorized to access.
              </li>
            </ul>
            <p>
              We may remove content or suspend accounts that break these rules.
            </p>
          </Section>

          <Section title="AI-generated content">
            <p>
              ShippedIn is built around shipping with AI tools. You can post
              content created with AI assistance, but you're still responsible
              for what you publish — the same rules above apply.
            </p>
          </Section>

          <Section title="Service changes">
            <p>
              We're actively building ShippedIn. Features may change, break,
              or be removed. We may pause or discontinue parts of the service
              at any time.
            </p>
          </Section>

          <Section title="Termination">
            <p>
              You can stop using ShippedIn at any time and ask us to delete
              your account. We may suspend or terminate accounts that violate
              these terms or create risk for the service or other users.
            </p>
          </Section>

          <Section title="No warranty">
            <p>
              ShippedIn is provided "as is" without warranties of any kind.
              We don't guarantee that the service will be uninterrupted,
              secure, or error-free.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p>
              To the maximum extent allowed by law, ShippedIn and its
              operators are not liable for indirect, incidental, or
              consequential damages arising out of your use of the service.
            </p>
          </Section>

          <Section title="Changes to these terms">
            <p>
              We may update these terms. When we do, we'll change the "Last
              updated" date above. Continuing to use ShippedIn after changes
              means you accept the updated terms.
            </p>
          </Section>

          <Section title="">
            <p>{"\n"}</p>
          </Section>
        </article>

        <div className="mt-16 border-t border-border/70 pt-6">
          <LegalFooter />
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 space-y-3 text-[15px] leading-7 text-foreground/90 [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_strong]:font-semibold [&_strong]:text-foreground">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}