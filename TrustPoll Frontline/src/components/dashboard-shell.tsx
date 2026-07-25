import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Server } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, params: undefined },
  {
    to: "/dashboard/server/$id",
    label: "Server 1",
    icon: Server,
    params: { id: "server_1" },
  },
  {
    to: "/dashboard/server/$id",
    label: "Server 2",
    icon: Server,
    params: { id: "server_2" },
  },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-6 py-6 text-lg font-semibold tracking-tight">
          TrustPoll
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {nav.map((item) => {
            const expectedPath = item.params
              ? `/dashboard/server/${item.params.id}`
              : "/dashboard";
            const active =
              expectedPath === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === expectedPath;
            const key = item.params ? `${item.to}:${item.params.id}` : item.to;
            return (
              <Link
                key={key}
                to={item.to}
                params={item.params as never}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-sidebar-muted hover:bg-white/5 hover:text-white",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
