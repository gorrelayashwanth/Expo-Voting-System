import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api, type Project } from "@/lib/api";
import { Plus, Trash2, Edit3, RefreshCw, Shield, AlertTriangle, CheckCircle, Database } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Management — TrustPoll Control Panel" },
      { name: "description", content: "Manage project datasets and reset voting state." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Add project form
  const [projNum, setProjNum] = useState("");
  const [title, setTitle] = useState("");
  const [teamName, setTeamName] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit modal / inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNum, setEditNum] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editTeam, setEditTeam] = useState("");

  const [resetting, setResetting] = useState(false);

  function showMsg(type: "success" | "error", text: string) {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  }

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await api.listProjects();
      setProjects(data || []);
    } catch (e: any) {
      showMsg("error", e.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projNum || !title.trim()) {
      showMsg("error", "Project Number and Title are required.");
      return;
    }
    setAdding(true);
    try {
      await api.adminCreateProject({
        project_number: parseInt(projNum, 10),
        title: title.trim(),
        team_name: teamName.trim() || undefined,
      });
      showMsg("success", `Project #${projNum} added successfully.`);
      setProjNum("");
      setTitle("");
      setTeamName("");
      fetchProjects();
    } catch (e: any) {
      showMsg("error", e.message || "Failed to add project.");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteProject = async (id: string, num: number) => {
    if (!confirm(`Are you sure you want to delete Project #${num}?`)) return;
    try {
      await api.adminDeleteProject(id);
      showMsg("success", `Project #${num} deleted.`);
      fetchProjects();
    } catch (e: any) {
      showMsg("error", e.message || "Failed to delete project.");
    }
  };

  const startEdit = (p: Project) => {
    setEditingId(p.id);
    setEditNum(String(p.project_number));
    setEditTitle(p.title);
    setEditTeam(p.team_name || "");
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await api.adminEditProject(id, {
        project_number: parseInt(editNum, 10),
        title: editTitle.trim(),
        team_name: editTeam.trim() || undefined,
      });
      showMsg("success", "Project updated successfully.");
      setEditingId(null);
      fetchProjects();
    } catch (e: any) {
      showMsg("error", e.message || "Failed to update project.");
    }
  };

  const handleResetVotes = async () => {
    if (!confirm("⚠️ WARNING: This will delete ALL cast votes and voter registrations from the database! Proceed for clean trial run?")) {
      return;
    }
    setResetting(true);
    try {
      const res = await api.adminResetVotes();
      showMsg("success", res.message || "All voting data cleared successfully.");
    } catch (e: any) {
      showMsg("error", e.message || "Failed to reset votes.");
    } finally {
      setResetting(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm("Seed default 3 Expo Projects? This will replace current projects.")) return;
    try {
      await api.adminSeedProjects([
        { project_number: 101, title: "AI-Powered Ballot Counter", team_name: "ByteBenders" },
        { project_number: 102, title: "Secure Blockchain Voting", team_name: "Decentralizers" },
        { project_number: 103, title: "Biometric Voter Authentication", team_name: "BioLock" },
      ]);
      showMsg("success", "Default projects dataset seeded!");
      fetchProjects();
    } catch (e: any) {
      showMsg("error", e.message || "Failed to seed default projects.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 max-w-4xl mx-auto font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
            <Shield className="h-4 w-4" /> ORGANIZER CONTROL PANEL
          </div>
          <h1 className="text-2xl font-bold tracking-tight">System Admin & Dataset Manager</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-semibold hover:border-foreground/40 transition-colors"
          >
            Live Dashboard ➔
          </Link>
          <Link
            to="/qr"
            className="px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-semibold hover:border-foreground/40 transition-colors"
          >
            QR Kiosk ➔
          </Link>
        </div>
      </div>

      {/* Message Toast */}
      {actionMessage && (
        <div
          className={`mb-6 rounded-lg p-4 text-xs font-semibold flex items-center gap-2 border ${
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {actionMessage.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {actionMessage.text}
        </div>
      )}

      {/* Grid of Control Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Reset Voting Data */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-destructive font-bold text-xs uppercase tracking-wider mb-2">
              <AlertTriangle className="h-4 w-4" /> Danger Zone / Trial Prep
            </div>
            <h2 className="text-lg font-bold">Clear All Voting Data</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Deletes all records from Votes, Voters, and VoteTokens tables. Use this before a new trial run or jury presentation.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetVotes}
            disabled={resetting}
            className="mt-6 h-10 w-full rounded-lg bg-destructive/20 border border-destructive/40 text-destructive font-bold text-xs hover:bg-destructive/30 transition-colors disabled:opacity-50"
          >
            {resetting ? "Resetting Database..." : "🧹 Clear Votes & Trial Registrations"}
          </button>
        </div>

        {/* Restore Default Dataset */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
              <Database className="h-4 w-4" /> Preset Dataset
            </div>
            <h2 className="text-lg font-bold">Seed Expo Default Projects</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Populates default Network Expo projects (#101 AI Ballot Counter, #102 Blockchain Voting, #103 Biometric Auth).
            </p>
          </div>

          <button
            type="button"
            onClick={handleSeedDefaults}
            className="mt-6 h-10 w-full rounded-lg bg-secondary border border-border text-foreground font-bold text-xs hover:border-foreground/40 transition-colors"
          >
            🌱 Seed Default 3 Projects Dataset
          </button>
        </div>
      </div>

      {/* Add New Project Card */}
      <div className="rounded-xl border border-border bg-card p-6 mb-8">
        <h2 className="text-base font-bold mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-emerald-400" /> Add New Project to Dataset
        </h2>

        <form onSubmit={handleAddProject} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="number"
            placeholder="Project # (e.g. 104)"
            value={projNum}
            onChange={(e) => setProjNum(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-foreground/60"
            required
          />
          <input
            type="text"
            placeholder="Project Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-foreground/60"
            required
          />
          <input
            type="text"
            placeholder="Team Name (Optional)"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-foreground/60"
          />
          <button
            type="submit"
            disabled={adding}
            className="sm:col-span-3 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs hover:bg-emerald-500/30 transition-colors disabled:opacity-50 mt-1"
          >
            {adding ? "Adding Project..." : "+ Add Project to Expo Database"}
          </button>
        </form>
      </div>

      {/* Manage Projects Table */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">Current Expo Dataset ({projects.length} Projects)</h2>
          <button
            type="button"
            onClick={fetchProjects}
            className="p-1.5 rounded-lg border border-border bg-secondary text-xs text-muted-foreground hover:text-foreground"
            title="Refresh list"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center text-xs text-muted-foreground py-8 animate-pulse">
            Loading active project dataset...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8 border border-dashed border-border rounded-lg">
            No projects in dataset. Use the form above to add projects or click Seed Default.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-border bg-background p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={editNum}
                        onChange={(e) => setEditNum(e.target.value)}
                        className="h-9 px-2.5 rounded border border-border bg-card"
                      />
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-9 px-2.5 rounded border border-border bg-card"
                      />
                      <input
                        type="text"
                        value={editTeam}
                        onChange={(e) => setEditTeam(e.target.value)}
                        className="h-9 px-2.5 rounded border border-border bg-card"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary font-bold">
                        #{p.project_number}
                      </span>
                      <div>
                        <div className="font-bold text-sm">{p.title}</div>
                        {p.team_name && <div className="text-muted-foreground text-[11px]">Team: {p.team_name}</div>}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(p.id)}
                          className="px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded bg-secondary text-muted-foreground"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="p-2 rounded border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(p.id, p.project_number)}
                          className="p-2 rounded border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
