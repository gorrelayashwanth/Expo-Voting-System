import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/confirmation")({
  head: () => ({
    meta: [
      { title: "Vote Recorded — TrustPoll" },
      { name: "description", content: "Your vote has been verified and committed to the database." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    server: typeof search.server === "string" ? search.server : "",
  }),
  component: ConfirmationPage,
});

function setVotedCookie() {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `trustpoll_voted=1; expires=${expires}; path=/; SameSite=Lax`;
}

function ConfirmationPage() {
  const { server } = Route.useSearch();
  const navigate = useNavigate();
  const assignedServer = server || "server_1";

  useEffect(() => {
    setVotedCookie();

    const url = `${window.location.pathname}${window.location.search}`;
    window.history.pushState({ trustpollConfirmation: true }, "", url);

    const onPopState = () => {
      window.history.pushState({ trustpollConfirmation: true }, "", url);
      navigate({ to: "/confirmation", search: { server: assignedServer }, replace: true });
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navigate, assignedServer]);

  return (
    <div className="min-h-screen max-w-md mx-auto px-5 py-10 flex flex-col items-center justify-center text-center w-full">
      {/* Animated Success Seal */}
      <div className="relative flex items-center justify-center w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-3xl font-bold">
          ✓
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">Vote Cast & Verified!</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Thank you for participating in Network Expo 2026.
      </p>

      {/* High-Tech System Ingestion Flow */}
      <div className="mt-6 w-full rounded-xl border border-border bg-card p-5 text-left text-xs space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground border-b border-border pb-2.5">
          <span className="uppercase tracking-wider font-semibold">Transaction Status</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            COMMITTED
          </span>
        </div>

        {/* Pipeline Step 1 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🌐</span>
            <div>
              <div className="font-semibold text-foreground">Load Balancer Routing</div>
              <div className="text-[11px] text-muted-foreground">Assigned healthiest node</div>
            </div>
          </div>
          <span className="font-mono text-[11px] text-emerald-400 font-medium">18 ms</span>
        </div>

        {/* Pipeline Step 2 */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-2.5">
            <span className="text-base">⚡</span>
            <div>
              <div className="font-semibold text-foreground">Backend Processor Node</div>
              <div className="text-[11px] text-emerald-400 font-semibold">{assignedServer}</div>
            </div>
          </div>
          <span className="font-mono text-[11px] text-emerald-400 font-medium">Active</span>
        </div>

        {/* Pipeline Step 3 */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-2.5">
            <span className="text-base">💾</span>
            <div>
              <div className="font-semibold text-foreground">PostgreSQL DB Entry</div>
              <div className="text-[11px] text-muted-foreground">Votes table row inserted</div>
            </div>
          </div>
          <span className="font-mono text-[11px] text-emerald-400 font-semibold">Sealed</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 w-full">
        <Link
          to="/dashboard"
          className="h-11 w-full rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          View Live Results Dashboard ➔
        </Link>
      </div>
    </div>
  );
}
