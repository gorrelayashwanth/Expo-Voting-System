import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api, type Project } from "@/lib/api";
import { loadVoter } from "@/lib/voter-session";
import { hasVotedCookie } from "@/lib/cookies";


export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Choose a project — TrustPoll" },
      { name: "description", content: "Select a Network Expo project to vote for." },
    ],
  }),
  component: ProjectsPage,
});

function friendlyError(raw: string): string {
  if (raw.includes("Transaction API error") || raw.includes("Unable to start a transaction"))
    return "Database connection timed out while processing your vote. Please tap 'Submit Vote' again.";
  if (raw.includes("All backend servers are down"))
    return "All voting servers are currently down. Please try again in a moment.";
  if (raw.includes("All backend servers failed"))
    return "The voting servers couldn't process your request. Please try again.";
  if (raw.includes("You have already voted"))
    return "This device or identifier has already cast a vote.";
  if (raw.includes("Token is missing"))
    return "Your voting link is missing its token. Please scan the QR code again.";
  if (raw.includes("Token has expired"))
    return "Your voting link has expired. Please scan a fresh QR code.";
  if (raw.includes("This link was opened on a different device"))
    return "This voting link was opened on another device. Open it on the original device.";
  if (raw.includes("503"))
    return "All voting servers are currently down. Please try again in a moment.";
  if (raw.includes("502"))
    return "The voting servers couldn't process your request. Please try again.";
  return raw || "Something went wrong. Please try again.";
}

function ProjectsPage() {
  const navigate = useNavigate();
  const voter = typeof window !== "undefined" ? loadVoter() : null;

  useEffect(() => {
    if (hasVotedCookie()) navigate({ to: "/", replace: true });
  }, [navigate]);


  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    api
      .listProjects(ctrl.signal)
      .then((data) => {
        setProjects(data);
        setLoadError(null);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setLoadError(friendlyError(err instanceof Error ? err.message : String(err)));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  const filtered = useMemo(() => {
    if (!projects) return [];
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      const hay = `${p.project_number} ${p.title} ${p.team_name ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [projects, query]);

  async function submit() {
    if (!voter?.voter_id || !selectedId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.vote(voter.voter_id, selectedId, voter.token);
      navigate({
        to: "/confirmation",
        search: { server: res.handled_by_server ?? "" },
      });
    } catch (err) {
      setSubmitError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen max-w-md mx-auto px-5 py-10 w-full flex flex-col">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Select a project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose one Network Expo project to cast your vote for.
        </p>
      </header>

      {!voter && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          You need to register first. Please return to the start screen.
        </div>
      )}

      <input
        type="search"
        placeholder="Search by number, title, or team…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm outline-none focus:border-foreground/60"
        disabled={loading || !!loadError}
      />

      <div className="mt-4 flex flex-col gap-2 min-h-[200px]">
        {loading && <ProjectSkeletons />}

        {!loading && loadError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {loadError}
          </div>
        )}

        {!loading && !loadError && projects && projects.length === 0 && (
          <div className="rounded-lg border border-border bg-card px-4 py-6 text-sm text-muted-foreground text-center">
            Project list not yet available — please check back shortly
          </div>
        )}

        {!loading && !loadError && filtered.length === 0 && projects && projects.length > 0 && (
          <div className="rounded-lg border border-border bg-card px-4 py-6 text-sm text-muted-foreground text-center">
            No projects match “{query}”.
          </div>
        )}

        {!loading &&
          !loadError &&
          filtered.map((p) => {
            const selected = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                aria-pressed={selected}
                className={`text-left rounded-xl border p-4 transition-colors ${
                  selected
                    ? "border-foreground bg-secondary"
                    : "border-border bg-card hover:border-foreground/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold">
                    {p.project_number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.title}</div>
                    {p.team_name && (
                      <div className="text-xs text-muted-foreground truncate">
                        {p.team_name}
                      </div>
                    )}
                  </div>
                  <div
                    className={`h-4 w-4 rounded-full border ${
                      selected ? "border-foreground bg-foreground" : "border-border"
                    }`}
                    aria-hidden
                  />
                </div>
              </button>
            );
          })}
      </div>

      {submitError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {submitError}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!voter || !selectedId || submitting || loading}
        className="mt-6 h-11 w-full rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
      >
        {submitting ? "Submitting vote…" : "Submit Vote"}
      </button>
    </div>
  );
}

function ProjectSkeletons() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-secondary" />
              <div className="h-2.5 w-1/2 rounded bg-secondary" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
