import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { StatusBadge } from "@/components/status-badge";
import { api, type DashboardSummary, type ServerHealth } from "@/lib/api";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Live Dashboard — TrustPoll" },
      { name: "description", content: "Real-time voting activity and server health." },
    ],
  }),
  component: DashboardHome,
});

const POLL_MS = 2000;

function DashboardHome() {
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
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(id);
    };
  }, []);

  const server1 = data?.servers?.server_1;
  const server2 = data?.servers?.server_2;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live voting activity across all servers.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Votes"
          value={data ? data.totalVotes.toLocaleString() : "—"}
        />
        <StatCard label="Server 1" value={<ServerStat server={server1} />} />
        <StatCard label="Server 2" value={<ServerStat server={server2} />} />
      </div>

      <div className="rounded-xl bg-card border border-border shadow-card p-6">
        <h2 className="text-sm font-medium">Votes per project</h2>
        <div className="mt-4">
          {!data ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : data.projectVotes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No projects yet.</p>
          ) : (
            <ProjectVotesChart projects={data.projectVotes} />
          )}
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border shadow-card p-6">
        <h2 className="text-sm font-medium">Recent votes</h2>
        <div className="mt-4">
          {!data ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : data.recentVotes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No votes recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border font-mono text-xs">
              {data.recentVotes.map((v) => (
                <li key={v.id} className="py-2 text-muted-foreground">
                  <span className="text-foreground">Vote</span> → {v.title} →{" "}
                  {v.handled_by_server} ({v.response_time_ms}ms)
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ChatbotPanel />
    </div>
  );
}

function ChatbotPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    setError(null);
    if (!q) {
      setError("Question is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.chatbotQuery(q);
      setAnswer(res.response);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sticky bottom-0 -mx-8 mt-6 border-t border-border bg-background/95 backdrop-blur px-8 py-4">
      <form onSubmit={handleSubmit} className="flex items-start gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask the TrustPoll assistant…"
          disabled={loading}
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Asking…" : "Ask"}
        </button>
      </form>
      {(answer || error) && (
        <div className="mt-3 text-sm">
          {error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : (
            <div className="whitespace-pre-wrap rounded-lg border border-border bg-card px-4 py-3 text-foreground">
              {answer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card border border-border shadow-card p-6">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function ServerStat({ server }: { server: ServerHealth | undefined }) {
  if (!server) return <span className="text-muted-foreground">—</span>;
  const avg =
    server.avg_response_time_ms === null || server.avg_response_time_ms === undefined
      ? "—"
      : `${server.avg_response_time_ms.toFixed(1)}ms`;
  return (
    <div className="flex items-center gap-3">
      <StatusBadge status={server.status} />
      <span className="text-sm font-normal text-muted-foreground">{avg}</span>
    </div>
  );
}

function ProjectVotesChart({
  projects,
}: {
  projects: DashboardSummary["projectVotes"];
}) {
  const max = Math.max(1, ...projects.map((p) => p.votes));
  return (
    <ul className="space-y-3">
      {projects.map((p) => {
        const pct = (p.votes / max) * 100;
        return (
          <li key={p.id}>
            <div className="flex justify-between text-xs">
              <span className="text-foreground truncate pr-2">
                <span className="text-muted-foreground mr-2">
                  #{p.project_number}
                </span>
                {p.title}
              </span>
              <span className="text-muted-foreground tabular-nums">{p.votes}</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-foreground transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
