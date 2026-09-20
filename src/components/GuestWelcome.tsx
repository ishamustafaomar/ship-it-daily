import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

const KEY = "shippedin:guest-welcome-dismissed";

export function GuestWelcome() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(KEY) === "1") setHidden(true);
  }, []);

  if (hidden) return null;

  return (
    <div className="border-b border-border/70 bg-primary/5 px-4 py-5">
      <div className="flex items-start gap-3">
        <BrandMark className="h-8 w-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">
            Turn your daily work into a public track record.
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            ShippedIn is a low-pressure daily feed for builders shipping with Lovable, Cursor,
            Bolt, v0, and Replit. Tag the tool you used, keep a streak, and get found by people
            solving the same problems. Browsing is free — join to post, reply, and react.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              search={{ next: "/home" }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Start your streak
            </Link>
            <Link
              to="/auth"
              search={{ next: "/home" }}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Sign in
            </Link>
            <Link
              to="/welcome"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              What is ShippedIn?
            </Link>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            localStorage.setItem(KEY, "1");
            setHidden(true);
          }}
          className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
