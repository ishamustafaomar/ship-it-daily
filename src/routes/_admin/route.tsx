import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin } from "@/lib/admin.functions";
import { LayoutDashboard, Users, MessageSquare, Activity, Flag, ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const res = await amIAdmin();
    if (!res.admin) throw redirect({ to: "/home" });
    return { user: data.user };
  },
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users, exact: false },
  { to: "/admin/ships", label: "Ships", icon: MessageSquare, exact: false },
  { to: "/admin/activity", label: "Activity", icon: Activity, exact: false },
  { to: "/admin/reports", label: "Reports", icon: Flag, exact: false },
  { to: "/admin/autopost", label: "Autopost", icon: Sparkles, exact: false },
] as const;

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl">
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-border/70 px-3 py-4 md:flex">
        <Link to="/home" className="mb-6 flex items-center gap-2 px-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Link>
        <div className="mb-2 px-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Admin
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-[15px] transition-colors ${
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}