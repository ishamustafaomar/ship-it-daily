import { Link } from "@tanstack/react-router";

export function LegalFooter({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground ${className}`}
    >
      <span className="font-mono">© ShippedIn</span>
      <Link to="/privacy" className="hover:text-foreground">
        Privacy
      </Link>
      <Link to="/terms" className="hover:text-foreground">
        Terms
      </Link>
    </div>
  );
}