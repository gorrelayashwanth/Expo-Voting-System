import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { api, type DashboardSummary } from "@/lib/api";

type ServerId = "server_1" | "server_2";

export const Route = createFileRoute("/dashboard/server/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${labelFor(params.id)} — TrustPoll` },
      {
        name: "description",
        content: `Live health and recent vote activity for ${labelFor(params.id)}.`,
      },
    ],
  }),
  component: ServerDetail,
});

const POLL_MS = 2000;

function labelFor(id: string) {
  if (id === "server_1") return "Server 1";
  if (id === "server_2") return "Server 2";
  return id;
}

function ServerDetail() {
  const { id } = Route.useParams();
  const serverId = id as ServerId;
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function tick() {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await api.dashboardSummary(controller.signal);
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (err) {
        if (!cancelled && (err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
      } finally {
        inFlight.current = false;
      }
    }

    tick();
    const intervalId = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  const server = data?.servers?.[serverId];
  const isKnown = serverId === "server_1" || serverId === "server_2";
  const filteredVotes = (data?.recentVotes ?? []).filter(
    (v) => v.handled_by_server === serverId,
  );

  const avg =
    server && server.avg_response_time_ms !== null && server.avg_response_time_ms !== undefined
      ? `${server.avg_response_time_ms.toFixed(1)}ms`
      : "—";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {labelFor(serverId)}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live health and recent activity for{" "}
            <span className="font-mono">{serverId}</span>.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Dashboard
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {!isKnown && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Unknown server id.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Status"
          value={
            server ? (
              <StatusBadge status={server.status} />
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
        <StatCard label="Avg response time" value={avg} />
        <StatCard
          label="Consecutive failures"
          value={
            server ? server.consecutive_failures.toLocaleString() : "—"
          }
        />
      </div>

      <div className="rounded-xl bg-card border border-border shadow-card p-6">
        <h2 className="text-sm font-medium">
          Recent votes handled by {labelFor(serverId)}
        </h2>
        <div className="mt-4">
          {!data ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : filteredVotes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No votes handled by this server yet.
            </p>
          ) : (
            <ul className="divide-y divide-border font-mono text-xs">
              {filteredVotes.map((v) => (
                <li key={v.id} className="py-2 text-muted-foreground">
                  <span className="text-foreground">Vote</span> → {v.title} →{" "}
                  {v.handled_by_server} ({v.response_time_ms}ms)
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-card border border-border shadow-card p-6">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
