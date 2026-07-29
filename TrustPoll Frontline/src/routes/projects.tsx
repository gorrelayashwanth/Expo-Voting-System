import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api, type Project } from "@/lib/api";
import { getVoter, clearVoter } from "@/lib/voter-session";
import { setVotedCookie, hasVotedCookie } from "@/lib/cookies";
import { CheckCircle2, Sparkles, Award } from "lucide-react";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Select a Project — TrustPoll" },
      { name: "description", content: "Choose one Network Expo project to cast your vote for." },
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
  const [voter] = useState(() => getVoter());
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (hasVotedCookie()) {
      navigate({ to: "/confirmation", replace: true });
      return;
    }

    if (!voter) {
      navigate({ to: "/", replace: true });
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);

    api
      .listProjects(controller.signal)
      .then((data) => setProjects(data))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setLoadError(friendlyError(err instanceof Error ? err.message : String(err)));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [navigate, voter]);

  const filtered = projects.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(p.project_number).includes(q) ||
      p.title.toLowerCase().includes(q) ||
      (p.team_name && p.team_name.toLowerCase().includes(q))
    );
  });

  async function submit() {
    if (!voter || !selectedId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await api.vote(voter.voter_id, selectedId, voter.token);
      setVotedCookie();
      clearVoter();
      navigate({
        to: "/confirmation",
        search: { server: res.handled_by_server || "" },
        replace: true,
      });
    } catch (err) {
      setSubmitError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between px-5 py-8 max-w-md mx-auto w-full font-sans antialiased">
      <div>
        {/* Step 2 Header */}
        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold mb-6">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Award className="h-4 w-4" /> Step 2 of 2
          </span>
          <span className="px-2.5 py-1 rounded-full bg-secondary text-[11px]">Ballot Selection</span>
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Select a Project</h1>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Choose one Network Expo project to cast your official vote.
          </p>
        </header>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="search"
            placeholder="Search by number, title, or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-style text-xs"
          />
        </div>

        {loadError && (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive font-medium mb-4">
            {loadError}
          </div>
        )}

        {/* Projects List */}
        <div className="flex flex-col gap-3">
          {loading && <ProjectSkeletons />}

          {!loading && !loadError && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-xs text-muted-foreground">
              {projects.length === 0 ? "No projects loaded yet." : "No projects match your search query."}
            </div>
          )}

          {!loading &&
            filtered.map((p) => {
              const selected = selectedId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`group w-full rounded-2xl p-5 text-left transition-all border shadow-sm ${
                    selected
                      ? "border-emerald-500/80 bg-emerald-500/5 shadow-md"
                      : "border-border/80 bg-card/90 hover:border-emerald-500/40"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                      selected ? "bg-emerald-500 text-white" : "bg-secondary text-foreground"
                    }`}>
                      #{p.project_number}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground tracking-tight leading-snug">
                        {p.title}
                      </div>
                      {p.team_name && (
                        <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                          Team: {p.team_name}
                        </div>
                      )}
                    </div>

                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                      selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"
                    }`}>
                      {selected && <CheckCircle2 className="h-4 w-4" />}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>

        {submitError && (
          <div role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive font-medium">
            {submitError}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!voter || !selectedId || submitting || loading}
          className="mt-6 h-12 w-full rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-spin" /> Committing Ballot...
            </span>
          ) : (
            "Submit Vote"
          )}
        </button>
      </div>

      {/* Clean Mobile Voter Footer */}
      <footer className="mt-12 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground/80">TrustPoll · Network Expo 2026</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Secure Multi-Node Distributed Voting System</p>
      </footer>
    </div>
  );
}

function ProjectSkeletons() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-3/4 rounded-md bg-secondary" />
              <div className="h-2.5 w-1/2 rounded-md bg-secondary" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
