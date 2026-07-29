import { createFileRoute, Link } from "@tanstack/react-router";
import { User, GraduationCap, Users, ShieldCheck, ChevronRight, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { hasVotedCookie, clearVotedCookie } from "@/lib/cookies";
import { clearVoter } from "@/lib/voter-session";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "TrustPoll — Network Expo Live Voting" },
      {
        name: "description",
        content: "Cast your vote securely for Network Expo 2026 projects.",
      },
    ],
  }),
  component: IdentitySelection,
});

const options = [
  {
    type: "guest",
    label: "Guest Visitor",
    icon: User,
    desc: "Industry visitor, external delegate or business guest",
    badge: "Visitor",
  },
  {
    type: "faculty",
    label: "Faculty / Judge",
    icon: Users,
    desc: "Academic faculty, professor or official project judge",
    badge: "Faculty",
  },
  {
    type: "student",
    label: "Student",
    icon: GraduationCap,
    desc: "Currently enrolled university student",
    badge: "Student",
  },
] as const;

function IdentitySelection() {
  const { token } = Route.useSearch();
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // If arriving with a fresh QR token parameter, automatically clear old local voting cookies/session
    if (token) {
      clearVotedCookie();
      clearVoter();
      setAlreadyVoted(false);
    } else {
      setAlreadyVoted(hasVotedCookie());
    }
    setChecked(true);
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col justify-between px-5 py-8 max-w-md mx-auto w-full font-sans antialiased">
      <div>
        {/* Header Branding */}
        <header className="pt-4 mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <ShieldCheck className="h-3.5 w-3.5" /> High-Throughput Voting Cluster
          </div>
          <h1 className="text-3xl font-bold tracking-tight">TrustPoll</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Select your attendee category to cast your vote for Network Expo 2026.
          </p>
        </header>

        {checked && alreadyVoted ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center shadow-lg backdrop-blur-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Vote Recorded</h2>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Your ballot has been cryptographically committed and sealed in PostgreSQL. Thank you for participating!
            </p>
            <div className="mt-6 pt-4 border-t border-border/60 text-[11px] text-muted-foreground font-mono">
              Status: Verified & Locked
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {options.map(({ type, label, icon: Icon, desc, badge }) => (
              <Link
                key={type}
                to="/register/$type"
                params={{ type }}
                search={{ token }}
                className="group relative flex items-center gap-4 rounded-2xl bg-card/90 p-5 shadow-sm border border-border/80 transition-all hover:border-emerald-500/50 hover:shadow-md hover:bg-card active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/80 text-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
                  <Icon className="h-6 w-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-foreground tracking-tight">{label}</span>
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-semibold text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
                      {badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{desc}</p>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Clean Mobile Voter Footer (Zero Organizer links) */}
      <footer className="mt-12 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground/80">Network Expo 2026</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Secure Multi-Node Distributed Voting System</p>
      </footer>
    </div>
  );
}
