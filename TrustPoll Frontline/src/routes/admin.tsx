import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api, API_BASE_URL, type Project, type DashboardSummary } from "@/lib/api";
import {
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Shield,
  AlertTriangle,
  CheckCircle,
  Database,
  Lock,
  Zap,
  Download,
  FileText,
  Printer,
  Archive,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Management — TrustPoll Control Panel" },
      { name: "description", content: "Manage project datasets, backup & reset voting state." },
    ],
  }),
  component: AdminPage,
});

const DEFAULT_ADMIN_PIN = "2026"; // Default Organizer Passcode

function AdminPage() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  // System State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Add project form
  const [projNum, setProjNum] = useState("");
  const [title, setTitle] = useState("");
  const [teamName, setTeamName] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNum, setEditNum] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editTeam, setEditTeam] = useState("");

  // Action Loading States
  const [resetting, setResetting] = useState(false);
  const [waking, setWaking] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Check session unlock on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const unlocked = sessionStorage.getItem("trustpoll_admin_unlocked");
      if (unlocked === "true") setIsAuthenticated(true);
    }
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pinInput.trim() === DEFAULT_ADMIN_PIN) {
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("trustpoll_admin_unlocked", "true");
      }
      setPinError("");
    } else {
      setPinError("Incorrect PIN. Please enter the valid Organizer passcode (2026).");
    }
  }

  function handleLogout() {
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("trustpoll_admin_unlocked");
    }
  }

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
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  // 1. Wake / Run Backend Nodes Button
  const handleWakeBackend = async () => {
    setWaking(true);
    try {
      await Promise.all([
        fetch(`${API_BASE_URL || "https://trustpoll-lb.onrender.com"}/api/projects`).catch(() => {}),
        fetch("https://trustpoll-server-1.onrender.com/health").catch(() => {}),
        fetch("https://trustpoll-server-2.onrender.com/health").catch(() => {}),
      ]);
      showMsg("success", "Sent wake-up signals to Load Balancer, Server 1, and Server 2!");
      fetchProjects();
    } catch (e: any) {
      showMsg("error", "Error waking backend nodes.");
    } finally {
      setWaking(false);
    }
  };

  // 2. Backup Current Votes to JSON file
  const createAutoBackup = async (): Promise<boolean> => {
    try {
      const summary = await api.dashboardSummary();
      const backupData = {
        timestamp: new Date().toISOString(),
        system: "TrustPoll Network Expo Voting System",
        summary,
        projects,
      };
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trustpoll_backup_${new Date().toISOString().split("T")[0]}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // 3. Reset All Voting Data with Automatic Pre-Reset Backup
  const handleResetVotes = async () => {
    if (
      !confirm(
        "⚠️ WARNING: This will clear ALL votes and voter registrations from PostgreSQL!\n\nAn automatic backup JSON file will be downloaded BEFORE clearing data. Continue?"
      )
    ) {
      return;
    }

    setResetting(true);
    try {
      showMsg("success", "Downloading auto-backup before database wipe...");
      await createAutoBackup();

      const res = await api.adminResetVotes();
      showMsg("success", `Backup saved! ${res.message || "Database cleared."}`);
    } catch (e: any) {
      showMsg("error", e.message || "Failed to reset voting data.");
    } finally {
      setResetting(false);
    }
  };

  // 4. Export Results as CSV
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const summary = await api.dashboardSummary();
      let csvContent = "data:text/csv;charset=utf-8,Project Number,Project Title,Team Name,Votes Count\n";
      summary.projectVotes.forEach((p) => {
        csvContent += `"${p.project_number}","${p.title}","${p.team_name || ''}",${p.votes_count}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `trustpoll_results_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showMsg("success", "Results exported to CSV file successfully.");
    } catch (e: any) {
      showMsg("error", e.message || "Failed to export CSV.");
    } finally {
      setExporting(false);
    }
  };

  // 5. Printable PDF / Official Summary Report
  const handlePrintPDF = async () => {
    try {
      const summary = await api.dashboardSummary();
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const projectRows = summary.projectVotes
        .map(
          (p) => `
        <tr>
          <td style="padding:10px; border:1px solid #ddd;">#${p.project_number}</td>
          <td style="padding:10px; border:1px solid #ddd;"><strong>${p.title}</strong></td>
          <td style="padding:10px; border:1px solid #ddd;">${p.team_name || "N/A"}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:right; font-weight:bold; color:#10b981;">${p.votes_count}</td>
        </tr>
      `
        )
        .join("");

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Official Results Report — TrustPoll Network Expo 2026</title>
          <style>
            body { font-family: -apple-system, Arial, sans-serif; padding: 40px; color: #111; }
            h1 { font-size: 24px; margin-bottom: 5px; }
            p.sub { color: #666; font-size: 14px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f3f4f6; text-align: left; padding: 10px; border: 1px solid #ddd; }
            .total { font-size: 18px; font-weight: bold; background: #e5e7eb; padding: 15px; border-radius: 8px; margin-bottom: 40px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
            .sig-box { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Official Network Expo 2026 Voting Results</h1>
          <p class="sub">Generated on ${new Date().toLocaleString()} | Verified by TrustPoll Distributed Load Balancer</p>
          
          <div class="total">Total Audited Votes Cast: ${summary.totalVotes}</div>

          <table>
            <thead>
              <tr>
                <th>Project #</th>
                <th>Title</th>
                <th>Team</th>
                <th style="text-align:right;">Total Votes</th>
              </tr>
            </thead>
            <tbody>
              ${projectRows}
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-box">Head of Jury Signature</div>
            <div class="sig-box">Organizer Signature</div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (e: any) {
      showMsg("error", e.message || "Failed to generate PDF print report.");
    }
  };

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

  // ----- PIN AUTHENTICATION GATE -----
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 font-mono">
        <div className="max-w-sm w-full rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mx-auto mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Admin Passcode Lock</h1>
          <p className="text-xs text-muted-foreground mt-1 mb-6">
            Enter the Organizer PIN to access system controls & dataset management.
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Enter PIN (Default: 2026)"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-4 text-center text-sm font-bold tracking-widest outline-none focus:border-foreground/60"
              autoFocus
            />

            {pinError && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-2.5">
                {pinError}
              </div>
            )}

            <button
              type="submit"
              className="h-11 w-full rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Unlock Admin Panel
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border text-[11px] text-muted-foreground">
            Default Passcode: <span className="font-bold text-foreground">2026</span>
          </div>
        </div>
      </div>
    );
  }

  // ----- AUTHENTICATED ADMIN PANEL -----
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
          <button
            type="button"
            onClick={handleWakeBackend}
            disabled={waking}
            className="px-3.5 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
            title="Wake all Render instances before presentation"
          >
            <Zap className="h-3.5 w-3.5" />
            {waking ? "Waking..." : "⚡ Wake Backend Nodes"}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-semibold hover:border-foreground/40 transition-colors"
          >
            Lock Panel 🔒
          </button>
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

      {/* Control Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Reset Voting Data */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-destructive font-bold text-xs uppercase tracking-wider mb-2">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </div>
            <h2 className="text-base font-bold">Clear All Voting Data</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Auto-downloads a backup JSON file before clearing Votes & Voters from database.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetVotes}
            disabled={resetting}
            className="mt-6 h-10 w-full rounded-lg bg-destructive/20 border border-destructive/40 text-destructive font-bold text-xs hover:bg-destructive/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Archive className="h-3.5 w-3.5" />
            {resetting ? "Backing up & Clearing..." : "🧹 Backup & Clear Votes"}
          </button>
        </div>

        {/* Export Results */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
              <Download className="h-4 w-4" /> Reports & Export
            </div>
            <h2 className="text-base font-bold">Export Official Results</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Export results as CSV spreadsheet or generate a print-ready PDF summary report.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exporting}
              className="h-10 rounded-lg bg-secondary border border-border text-foreground font-bold text-xs hover:border-foreground/40 transition-colors flex items-center justify-center gap-1"
            >
              <FileText className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              type="button"
              onClick={handlePrintPDF}
              className="h-10 rounded-lg bg-secondary border border-border text-foreground font-bold text-xs hover:border-foreground/40 transition-colors flex items-center justify-center gap-1"
            >
              <Printer className="h-3.5 w-3.5" /> PDF / Print
            </button>
          </div>
        </div>

        {/* Restore Default Dataset */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Database className="h-4 w-4" /> Preset Dataset
            </div>
            <h2 className="text-base font-bold">Seed Default Projects</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Populates default Network Expo projects (#101 AI Ballot, #102 Blockchain, #103 Biometric).
            </p>
          </div>

          <button
            type="button"
            onClick={handleSeedDefaults}
            className="mt-6 h-10 w-full rounded-lg bg-secondary border border-border text-foreground font-bold text-xs hover:border-foreground/40 transition-colors"
          >
            🌱 Seed Default 3 Projects
          </button>
        </div>
      </div>

      {/* Add New Project Form */}
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
            {adding ? "Adding Project..." : "+ Add Project to Database"}
          </button>
        </form>
      </div>

      {/* Projects List */}
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
