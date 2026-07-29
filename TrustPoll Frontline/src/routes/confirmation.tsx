import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2, ShieldCheck, Cpu, Database, Network } from "lucide-react";

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
    <div className="min-h-screen flex flex-col justify-between px-5 py-8 max-w-md mx-auto w-full font-sans antialiased text-center">
      <div className="my-auto flex flex-col items-center">
        {/* Animated Success Seal */}
        <div className="relative flex items-center justify-center w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-3xl font-bold shadow-sm">
            <CheckCircle2 className="h-9 w-9" />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight">Vote Cast & Verified!</h1>
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-xs">
          Thank you for participating in Network Expo 2026. Your ballot is cryptographically recorded.
        </p>

        {/* High-Tech System Ingestion Flow */}
        <div className="mt-6 w-full rounded-2xl border border-border/80 bg-card/90 p-5 text-left text-xs space-y-3.5 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/60 pb-2.5">
            <span className="uppercase tracking-wider font-semibold">Transaction Status</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              COMMITTED
            </span>
          </div>

          {/* Pipeline Step 1 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Network className="h-4 w-4 text-emerald-400" />
              <div>
                <div className="font-semibold text-foreground">Load Balancer Routing</div>
                <div className="text-[11px] text-muted-foreground">Assigned healthiest node</div>
              </div>
            </div>
            <span className="font-mono text-[11px] text-emerald-400 font-medium">18 ms</span>
          </div>

          {/* Pipeline Step 2 */}
          <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
            <div className="flex items-center gap-2.5">
              <Cpu className="h-4 w-4 text-emerald-400" />
              <div>
                <div className="font-semibold text-foreground">Backend Processor Node</div>
                <div className="text-[11px] text-emerald-400 font-semibold">{assignedServer}</div>
              </div>
            </div>
            <span className="font-mono text-[11px] text-emerald-400 font-medium">Active</span>
          </div>

          {/* Pipeline Step 3 */}
          <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
            <div className="flex items-center gap-2.5">
              <Database className="h-4 w-4 text-emerald-400" />
              <div>
                <div className="font-semibold text-foreground">PostgreSQL Database Entry</div>
                <div className="text-[11px] text-muted-foreground">Votes table row inserted</div>
              </div>
            </div>
            <span className="font-mono text-[11px] text-emerald-400 font-semibold">Sealed</span>
          </div>
        </div>
      </div>

      {/* Clean Mobile Voter Footer */}
      <footer className="pt-6 border-t border-border/40 text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground/80">TrustPoll · Network Expo 2026</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Secure Multi-Node Distributed Voting System</p>
      </footer>
    </div>
  );
}
