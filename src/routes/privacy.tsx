import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalFooter } from "@/components/LegalFooter";

const LAST_UPDATED = "July 18, 2026";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ShippedIn" },
      {
        name: "description",
        content:
          "How ShippedIn collects, uses, and protects your data. Plain-English privacy policy for the ShippedIn build-in-public feed.",
      },
      { property: "og:title", content: "Privacy Policy — ShippedIn" },
      {
        property: "og:description",
        content: "How ShippedIn collects, uses, and protects your data.",
      },
      { property: "og:url", content: "https://shippedin.dev/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://shippedin.dev/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="font-mono text-lg font-semibold tracking-tight">ShippedIn</span>
        </Link>
        <Link
          to="/terms"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Terms
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-20">
        <article className="prose-legal">
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Last updated: {LAST_UPDATED}
          </p>

          <div className="mt-6 rounded-md border border-border bg-card/60 p-4 text-sm text-muted-foreground">
            ShippedIn is an early-stage product. This policy is written in plain
            English and may be updated as the product evolves. We'll update the
            date above when we make changes.
          </div>

          <Section title="Who we are">
            <p>
              ShippedIn ("we", "us") is a small build-in-public social feed for
              builders shipping with AI tools. This policy explains what data we
              collect when you use ShippedIn and what we do with it.
            </p>
          </Section>

          <Section title="What we collect">
            <ul>
              <li>
                <strong>Account info.</strong> When you sign up we collect your
                email address and, if you sign in with Google, your name and
                profile image from Google.
              </li>
              <li>
                <strong>Profile info.</strong> Anything you add to your profile:
                username, display name, bio, avatar, focus tags.
              </li>
              <li>
                <strong>Content you post.</strong> Ships, replies, reactions,
                links, images, and other content you submit.
              </li>
              <li>
                <strong>Basic usage data.</strong> Standard server and analytics
                data such as pages viewed, approximate location from IP,
                browser type, and timestamps. We use this to keep the site
                working and understand how it's used.
              </li>
            </ul>
          </Section>

          <Section title="How we use it">
            <ul>
              <li>To run the app: show your ships, streak, notifications, and feed.</li>
              <li>To keep the service secure and prevent abuse.</li>
              <li>To improve ShippedIn and fix bugs.</li>
              <li>
                To contact you about your account (e.g. sign-in emails). We
                don't send marketing email at this stage.
              </li>
            </ul>
          </Section>

          <Section title="Who we share it with">
            <p>
              We don't sell your personal data. We use a small number of
              third-party providers to run ShippedIn:
            </p>
            <ul>
              <li>
                <strong>Authentication & database.</strong> Our backend
                (database, auth, storage) is provided by Supabase.
              </li>
              <li>
                <strong>Hosting.</strong> The site is hosted via Lovable and
                Cloudflare.
              </li>
              <li>
                <strong>Google.</strong> If you sign in with Google, Google
                processes your credentials.
              </li>
              <li>
                <strong>Analytics.</strong> Basic aggregate analytics on how
                the site is used.
              </li>
            </ul>
            <p>
              Each provider has its own privacy policy and only processes the
              data needed to provide their service to us.
            </p>
          </Section>

          <Section title="Public content">
            <p>
              Ships, replies, reactions, your username, display name, avatar,
              bio and streak are public by default — that's the point of a
              build-in-public feed. Don't post anything you wouldn't want
              publicly visible.
            </p>
          </Section>

          <Section title="Storage & retention">
            <p>
              We keep your account and content while your account is active. If
              you delete your account, we remove your profile and posts from
              the public feed. Backups and logs may persist for a limited time
              before being overwritten.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              You can edit your profile at any time, delete your posts, or ask
              us to delete your account. Depending on where you live, you may
              have additional rights under laws like GDPR or CCPA (access,
              correction, deletion, portability). Contact us to exercise them.
            </p>
          </Section>

          <Section title="Children">
            <p>
              ShippedIn is not intended for children under 13. Don't use the
              service if you're under 13.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              As an early product, this policy may change. We'll update the
              "Last updated" date above when it does. Material changes will be
              highlighted in the app.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions or requests? Email{" "}
              <a
                href="mailto:omarmlaptop@gmail.com"
                className="text-primary hover:underline"
              >
                omarmlaptop@gmail.com
              </a>
              .
            </p>
          </Section>
        </article>

        <div className="mt-16 border-t border-border/70 pt-6">
          <LegalFooter />
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 space-y-3 text-[15px] leading-7 text-foreground/90 [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_strong]:font-semibold [&_strong]:text-foreground">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}