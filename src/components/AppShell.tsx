import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Home, Compass, Bell, User, Plus, LogOut, Flame } from "lucide-react";
import { useState, type ReactNode } from "react";
import { getMyProfile, getUnreadCount } from "@/lib/api.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Composer } from "./Composer";
import { UserAvatar } from "./UserAvatar";

const NAV = [
  { label: "Home", to: "/home", icon: Home },
  { label: "Explore", to: "/explore", icon: Compass },
  { label: "Notifications", to: "/notifications", icon: Bell },
  { label: "Profile", to: "/profile", icon: User },
] as const;

export function AppShell({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [composerOpen, setComposerOpen] = useState(false);
  const meFn = useServerFn(getMyProfile);
  const unreadFn = useServerFn(getUnreadCount);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const { data: unread } = useQuery({
    queryKey: ["unread"],
    queryFn: () => unreadFn(),
    refetchInterval: 30_000,
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const activeIs = (to: string) =>
    pathname === to ||
    (to === "/profile" && pathname.startsWith("/u/") && me?.username && pathname.includes(me.username));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl">
      {/* Left nav */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-border/70 px-3 py-4 md:flex">
        <Link to="/home" className="mb-6 flex items-center gap-2 px-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span className="font-mono text-lg font-semibold tracking-tight">ShippedIn</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = activeIs(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-[15px] transition-colors ${
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                <span>{item.label}</span>
                {item.to === "/notifications" && unread && unread.count > 0 ? (
                  <span className="ml-auto rounded-full bg-primary px-1.5 font-mono text-[10px] text-primary-foreground">
                    {unread.count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <Button
          className="mt-4 gap-2"
          onClick={() => setComposerOpen(true)}
          disabled={!me?.username}
        >
          <Plus className="h-4 w-4" />
          New Ship
        </Button>

        <Link
          to="/connect"
          className="mt-auto mb-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          Connect to ChatGPT / Claude →
        </Link>
        <div className="flex items-center gap-2 rounded-md border border-border/70 p-2">
          <UserAvatar url={me?.avatar_url} name={me?.display_name} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{me?.display_name ?? "You"}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              @{me?.username ?? "…"}
            </p>
          </div>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Center */}
      <main className="min-w-0 flex-1 border-x border-border/70 pb-24 md:pb-6">
        {/* Mobile header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur md:hidden">
          <Link to="/home" className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <span className="font-mono text-base font-semibold">ShippedIn</span>
          </Link>
          {me?.streak_count ? (
            <div className="flex items-center gap-1 font-mono text-sm">
              <Flame className="h-4 w-4 text-primary" />
              <span>{me.streak_count}</span>
            </div>
          ) : null}
        </div>
        {children}
      </main>

      {/* Right rail */}
      <aside className="sticky top-0 hidden h-screen w-[320px] shrink-0 overflow-y-auto px-4 py-4 lg:block">
        {right}
      </aside>

      {/* Mobile bottom tab bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border/70 bg-background/95 py-2 backdrop-blur md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = activeIs(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.to === "/notifications" && unread && unread.count > 0 ? (
                <span className="absolute right-1 top-0 h-1.5 w-1.5 rounded-full bg-primary" />
              ) : null}
            </Link>
          );
        })}
        <button
          onClick={() => setComposerOpen(true)}
          disabled={!me?.username}
          className="rounded-full bg-primary p-3 text-primary-foreground shadow-lg"
          aria-label="New Ship"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogTitle className="sr-only">New Ship</DialogTitle>
          {me?.id && me.username ? (
            <Composer
              myUserId={me.id}
              avatarUrl={me.avatar_url}
              onDone={() => setComposerOpen(false)}
              autoFocus
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}